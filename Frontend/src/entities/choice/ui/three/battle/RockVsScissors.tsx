import { useLayoutEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { getRingGeometry, HALF_Z, RING_CENTER, RING_STRETCH, SCISSORS_SCALE } from '../geometry';
import { materials } from '../materials';
import { RockMesh, ScissorHandle, ScissorScrew } from '../models';
import { castBlobShadow } from '../shadowCaster';
import { BlobShadow } from '../shadows';
import { useBattleFrame } from './clock';
import { Debris } from './debris';
import { Flashes, Puffs, Sparks, type Flash, type Puff, type SparkBurst } from './fx';
import { getBreakableScissors } from './scissorsParts';
import { FIGHT_X, GROUND_Y, HOME_X } from './stage';
import { decay, ease, kick, lerp, seg, smoothstep, track, type Key } from './timeline';

/** Impact times: two blows in the air, then a final slam into the floor. */
const HIT_1 = 1.25;
const HIT_2 = 1.95;
const SLAM_CONTACT = 2.66;
const SLAM = 2.7;
const BACK_HOME = 3.65;

export const ROCK_VS_SCISSORS_DURATION = 3.7;

const ROCK_SCALE = 0.8;

const ROCK_PATH: Key[] = [
  { t: 0.5, v: [-HOME_X, 0] },
  { t: 0.9, v: [-HOME_X - 0.4, 0.35], ease: ease.outQuad },
  { t: HIT_1, v: [0.85, 0.55], ease: ease.inCubic, arc: [0, 0.5] },
  { t: 1.6, v: [0.35, 1.35], ease: ease.outQuad },
  { t: HIT_2, v: [1.0, 0.2], ease: ease.inCubic },
  { t: 2.35, v: [FIGHT_X, 1.5], ease: ease.outQuad },
  { t: SLAM, v: [FIGHT_X, -0.5], ease: ease.inCubic },
  { t: 3.05, v: [0.5, 0.55], ease: ease.outQuad },
  { t: BACK_HOME, v: [-HOME_X, 0], ease: ease.inOutQuad, arc: [0, 0.35] },
];

/** Tumbling angle of the rock: it spins while attacking and calms down once home. */
function rockSpin(t: number) {
  const from = 0.55;
  const to = Math.min(t, BACK_HOME);
  if (to <= from) return 0;
  const steps = 48;
  const dt = (to - from) / steps;
  let angle = 0;
  for (let i = 0; i < steps; i++) {
    const u = from + (i + 0.5) * dt;
    angle += 7 * smoothstep((u - 0.55) / 0.35) * (1 - smoothstep((u - 3.05) / 0.6)) * dt;
  }
  return angle;
}

const SPARKS: SparkBurst[] = [
  { t: HIT_1, at: [1.12, 0.32, 0.3], count: 16, power: 4 },
  { t: HIT_2, at: [1.28, 0, 0.3], count: 18, power: 4.5 },
  { t: SLAM, at: [FIGHT_X, -1.0, 0.4], count: 28, power: 5.5 },
];
const FLASHES: Flash[] = [
  { t: HIT_1, at: [1.12, 0.32, 0.4], size: 0.7 },
  { t: HIT_2, at: [1.28, 0, 0.4], size: 0.8 },
  { t: SLAM, at: [FIGHT_X, -0.95, 0.5], size: 1.25 },
];
const PUFFS: Puff[] = [
  { t: SLAM, at: [FIGHT_X, GROUND_Y + 0.12, 0.2], count: 10, spread: 1.5, rise: 0.3, size: 0.95, life: 1.2, opacity: 0.4 },
];

const point = [0, 0];

export function RockVsScissors() {
  const parts = useMemo(getBreakableScissors, []);
  const steel = materials.battleSteel();
  const handle = materials.handle();

  const space = useRef<THREE.Group>(null);
  const rock = useRef<THREE.Group>(null);
  const rockMesh = useRef<THREE.Mesh>(null);
  const scissors = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const frontBlade = useRef<THREE.Mesh>(null);
  const frontStump = useRef<THREE.Mesh>(null);
  const backBlade = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const brokenRing = useRef<THREE.Mesh>(null);
  const screw = useRef<THREE.Mesh>(null);
  const rockShadow = useRef<THREE.Mesh>(null);
  const scissorsShadow = useRef<THREE.Mesh>(null);

  // Anchors mark where each piece sits on the rig; debris are the free-flying copies.
  const tipAnchor = useRef<THREE.Group>(null);
  const screwAnchor = useRef<THREE.Group>(null);
  const fragmentAnchors = useRef<(THREE.Group | null)[]>([]);
  const tipDebris = useRef<THREE.Mesh>(null);
  const screwDebris = useRef<THREE.Group>(null);
  const fragmentDebris = useRef<(THREE.Mesh | null)[]>([]);

  const debris = useMemo(
    () => ({
      tip: new Debris({ at: HIT_2, velocity: [1.0, 3.4, 0.9], spin: [6, 2, 11], rest: [-1.45, 0, 0.7] }),
      screw: new Debris({ at: SLAM, velocity: [-1.1, 3.9, 1.5], spin: [14, 3, 6], rest: [0.2, 0, 0.4] }),
      fragments: [
        new Debris({ at: HIT_2, velocity: [-1.3, 2.6, 1.1], spin: [9, 5, 3], rest: [-1.5, 0, 0.3] }),
        new Debris({ at: HIT_2, velocity: [0.4, 3.3, 1.6], spin: [4, 8, 6], rest: [-1.5, 0, 1.9] }),
        new Debris({ at: HIT_2, velocity: [1.9, 2.2, 0.5], spin: [7, 2, 9], rest: [-1.5, 0, -0.8] }),
      ],
    }),
    [],
  );

  const pose = (t: number) => {
    const hit1 = ease.outCubic(seg(t, HIT_1, HIT_1 + 0.14));
    const hit2 = ease.outCubic(seg(t, HIT_2, HIT_2 + 0.14));
    const slam = ease.inQuad(seg(t, SLAM_CONTACT, SLAM + 0.02));
    const scatter = ease.outCubic(seg(t, SLAM, SLAM + 0.45));
    const recoil1 = kick(t, HIT_1);
    const recoil2 = kick(t, HIT_2);
    const intro = ease.outBack(seg(t, 0.05, 0.5));

    // --- Rock
    if (rock.current && rockMesh.current) {
      track(ROCK_PATH, t, point);
      const home = seg(t, BACK_HOME, BACK_HOME + 0.5);
      const squash = decay(t, HIT_1, 16) + decay(t, HIT_2, 16) + 1.4 * decay(t, SLAM, 14);
      rock.current.position.set(point[0], point[1] + 0.06 * Math.sin((t - BACK_HOME) * 1.6) * home, 0);
      rock.current.scale.set(
        ROCK_SCALE * intro * (1 + 0.14 * squash),
        ROCK_SCALE * intro * (1 - 0.2 * squash),
        ROCK_SCALE * intro,
      );
      rockMesh.current.rotation.set(0.15, 0.35 * Math.max(0, t - BACK_HOME), -rockSpin(t));
      castBlobShadow(rockShadow.current, point[0], 0, point[1] - GROUND_Y - 0.7, 0.85 * intro);
    }

    // --- Scissors: knocked around in the air, then smashed onto the floor
    if (scissors.current) {
      const hover = (1 - hit1) * 0.06 * Math.sin(t * 1.6);
      const x = FIGHT_X + 0.18 * hit1 + 0.12 * hit2 + 0.45 * recoil1 + 0.4 * recoil2;
      const y = hover - 0.25 * hit1 - 0.3 * hit2 - 0.4 * recoil1 - 0.45 * recoil2;
      const rz = -0.55 + 0.5 * hit1 - 0.95 * hit2 + 0.5 * recoil1 - 0.6 * recoil2;
      const rx = -0.3 * hit1 + 0.45 * hit2 + 0.3 * recoil1;
      const ry = 0.25 * Math.sin(t * 0.5) * (1 - hit1) + 0.45 * hit2;
      scissors.current.position.set(lerp(x, FIGHT_X + 0.1, slam), lerp(y, GROUND_Y + 0.2, slam), -0.25 * slam);
      scissors.current.rotation.set(lerp(rx, -1.2, slam), lerp(ry, 0, slam), lerp(rz, -1.45, slam));
      scissors.current.scale.setScalar(intro);
      // The wreck spreads on the floor, so its shadow widens once it is down.
      castBlobShadow(
        scissorsShadow.current,
        scissors.current.position.x,
        scissors.current.position.z,
        scissors.current.position.y - GROUND_Y - 0.5,
        (0.7 + 0.5 * slam) * intro,
      );
    }

    // The two halves are forced open, then slide apart once the screw is gone.
    if (front.current && back.current) {
      const breathe = (1 - hit1) * 0.06 * Math.sin(t * 1.4);
      front.current.rotation.z = -(0.16 + breathe + 0.4 * hit1 + 0.15 * hit2) + 1.1 * scatter;
      front.current.position.set(-0.75 * scatter, 0.3 * scatter, 0);
      back.current.rotation.z = 0.16 + breathe + 0.1 * hit1 + 0.55 * hit2 - 0.8 * scatter;
      back.current.position.set(0.6 * scatter, -0.2 * scatter, 0);
    }

    // Metal damage: bent blades, snapped tip, shattered ring, lost screw.
    const bendFront = 0.45 * hit1 + 0.25 * hit2 + 0.2 * slam;
    const warpFront = 0.25 * hit1 + 0.3 * hit2;
    for (const blade of [frontBlade.current, frontStump.current, tipDebris.current]) {
      if (!blade?.morphTargetInfluences) continue;
      blade.morphTargetInfluences[0] = bendFront;
      blade.morphTargetInfluences[1] = warpFront;
    }
    if (backBlade.current?.morphTargetInfluences) {
      backBlade.current.morphTargetInfluences[0] = -(0.3 * hit1 + 0.5 * hit2 + 0.15 * slam);
      backBlade.current.morphTargetInfluences[1] = 0.5 * hit1 + 0.4 * hit2 + 0.2 * slam;
    }
    const wear = (hit1 + hit2 + slam) / 3;
    steel.roughness = lerp(0.22, 0.6, wear);
    steel.color.setRGB(lerp(0.86, 0.5, wear), lerp(0.88, 0.5, wear), lerp(0.9, 0.52, wear));

    const snapped = t >= HIT_2;
    if (frontBlade.current) frontBlade.current.visible = !snapped;
    if (frontStump.current) frontStump.current.visible = snapped;
    if (ring.current) ring.current.visible = !snapped;
    if (brokenRing.current) brokenRing.current.visible = snapped;
    if (screw.current) screw.current.visible = t < SLAM;

    if (tipDebris.current) debris.tip.apply(tipDebris.current, t);
    if (screwDebris.current) debris.screw.apply(screwDebris.current, t);
    debris.fragments.forEach((fragment, i) => {
      const mesh = fragmentDebris.current[i];
      if (mesh) fragment.apply(mesh, t);
    });
  };

  // Snapshot where each piece is at the instant it breaks off.
  useLayoutEffect(() => {
    const root = space.current;
    if (!root) return;
    for (const mesh of [frontBlade.current, frontStump.current, backBlade.current, tipDebris.current]) {
      mesh?.updateMorphTargets();
    }
    pose(HIT_2);
    if (tipAnchor.current) debris.tip.capture(tipAnchor.current, root);
    debris.fragments.forEach((fragment, i) => {
      const anchor = fragmentAnchors.current[i];
      if (anchor) fragment.capture(anchor, root);
    });
    pose(SLAM);
    if (screwAnchor.current) debris.screw.capture(screwAnchor.current, root);
    pose(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-off measurement on mount
  }, []);

  useBattleFrame((t, clock) => {
    pose(t);
    clock.shake = 0.07 * decay(t, HIT_1, 9) + 0.09 * decay(t, HIT_2, 9) + 0.16 * decay(t, SLAM, 8);
  });

  return (
    <group ref={space}>
      <group ref={rock} position={[-HOME_X, 0, 0]}>
        <RockMesh ref={rockMesh} />
      </group>

      <group ref={scissors} position={[FIGHT_X, 0, 0]}>
        <group scale={SCISSORS_SCALE}>
          <group ref={front}>
            <group position-z={HALF_Z}>
              <mesh ref={frontBlade} geometry={parts.intact} material={steel} />
              <mesh ref={frontStump} geometry={parts.lower} material={steel} visible={false} />
              <group ref={tipAnchor} position={parts.tipCentre} />
              <ScissorHandle />
            </group>
          </group>
          <group ref={back}>
            <group position-z={-HALF_Z} scale={[-1, 1, 1]}>
              <mesh ref={backBlade} geometry={parts.intact} material={steel} />
              <ScissorHandle ring={false} />
              <group position={[RING_CENTER.x, RING_CENTER.y, 0]} scale={[RING_STRETCH, 1, 1]}>
                <mesh ref={ring} geometry={getRingGeometry()} material={handle} />
                <mesh
                  ref={brokenRing}
                  geometry={parts.ring.broken}
                  material={handle}
                  rotation-z={parts.ring.brokenAngle}
                  visible={false}
                />
                {parts.ring.fragmentAngles.map((angle, i) => (
                  <group key={angle} rotation-z={angle}>
                    <group
                      ref={(o) => {
                        fragmentAnchors.current[i] = o;
                      }}
                      position={parts.ring.fragmentCentre}
                    />
                  </group>
                ))}
              </group>
            </group>
          </group>
          <group ref={screwAnchor} />
          <ScissorScrew ref={screw} />
        </group>
      </group>

      <mesh ref={tipDebris} geometry={parts.tip} material={steel} visible={false} />
      <group ref={screwDebris} visible={false}>
        <ScissorScrew />
      </group>
      {parts.ring.fragmentAngles.map((angle, i) => (
        <mesh
          key={angle}
          ref={(o) => {
            fragmentDebris.current[i] = o;
          }}
          geometry={parts.ring.fragment}
          material={handle}
          visible={false}
        />
      ))}

      <BlobShadow ref={rockShadow} slot="battle-a" />
      <BlobShadow ref={scissorsShadow} slot="battle-b" />

      <Sparks bursts={SPARKS} />
      <Flashes flashes={FLASHES} />
      <Puffs puffs={PUFFS} />
    </group>
  );
}
