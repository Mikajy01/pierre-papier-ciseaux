import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  BLADE,
  getUnitPlane,
  PAPER_H,
  PAPER_SCALE,
  PAPER_W,
  SCISSORS_SCALE,
} from '../geometry';
import { materials } from '../materials';
import { ScissorsBody } from '../models';
import { mulberry32 } from '../noise';
import { castBlobShadow } from '../shadowCaster';
import { BlobShadow } from '../shadows';
import { useBattleFrame } from './clock';
import {
  BACK_HOME,
  cutTime,
  FALL_AT,
  getCutLayers,
  PAPER_POSITION,
  PAPER_QUAT,
  SLASH_Z,
  SLASHES,
  SLIT,
  slashPoint,
} from './cuttingPlan';
import { FIGHT_X, GROUND_Y, HOME_X, onFxLayer } from './stage';
import { clamp01, decay, ease, kick, lerp, seg, smoothstep, solveDecreasing, track, type Key } from './timeline';

export const SCISSORS_VS_PAPER_DURATION = 3.3;

const BLADE_REACH = BLADE.tip.y * SCISSORS_SCALE;

/* ------------------------- Scissors choreography ------------------------ */

const HOME = [-HOME_X, 0, 0];
const xyz = (v: THREE.Vector3) => [v.x, v.y, v.z];
/** Blades point to +Y, so heading `angle` means rotating by angle - 90°. */
const heading = (i: number, turns = 0) => SLASHES[i].angle - Math.PI / 2 + turns * Math.PI * 2;

const SCISSORS_PATH: Key[] = [
  { t: 0.5, v: HOME },
  { t: 0.85, v: [-HOME_X - 0.3, 0.5, SLASH_Z], ease: ease.outQuad },
  { t: SLASHES[0].start, v: xyz(slashPoint(0, SLASHES[0].from)), ease: ease.inQuad },
  { t: SLASHES[0].end, v: xyz(slashPoint(0, SLASHES[0].to)), ease: ease.linear },
  { t: SLASHES[1].start, v: xyz(slashPoint(1, SLASHES[1].from)), arc: [0.5, 0, 0] },
  { t: SLASHES[1].end, v: xyz(slashPoint(1, SLASHES[1].to)), ease: ease.linear },
  { t: SLASHES[2].start, v: xyz(slashPoint(2, SLASHES[2].from)), arc: [-0.4, 0, 0] },
  { t: SLASHES[2].end, v: xyz(slashPoint(2, SLASHES[2].to)), ease: ease.linear },
  { t: SLASHES[3].start, v: xyz(slashPoint(3, SLASHES[3].from)), arc: [0.5, 0.4, 0] },
  { t: SLASHES[3].end, v: xyz(slashPoint(3, SLASHES[3].to)), ease: ease.linear },
  { t: BACK_HOME, v: HOME, ease: ease.inOutCubic, arc: [0, -0.2, 0.4] },
];

/** [rotation z, opening angle]. The blades snap shut along each slash. */
const SCISSORS_POSE: Key[] = [
  { t: 0.5, v: [-0.55, 0.16] },
  { t: 0.85, v: [heading(0), 0.62], ease: ease.outQuad },
  { t: SLASHES[0].start, v: [heading(0), 0.62] },
  { t: SLASHES[0].end, v: [heading(0), 0.02], ease: ease.inQuad },
  { t: SLASHES[1].start, v: [heading(1, -1), 0.62] },
  { t: SLASHES[1].end, v: [heading(1, -1), 0.02], ease: ease.inQuad },
  { t: SLASHES[2].start, v: [heading(2), 0.62] },
  { t: SLASHES[2].end, v: [heading(2), 0.02], ease: ease.inQuad },
  { t: SLASHES[3].start, v: [heading(3), 0.62] },
  { t: SLASHES[3].end, v: [heading(3), 0.02], ease: ease.inQuad },
  { t: BACK_HOME, v: [-0.55 - Math.PI * 2, 0.16], ease: ease.inOutCubic },
];

/* ------------------------------ Paper pieces ---------------------------- */

interface FallingPiece {
  geometry: THREE.BufferGeometry;
  layer: number;
  /** Resting place on the intact sheet. */
  base: THREE.Vector3;
  baseQuat: THREE.Quaternion;
  /** Small shift applied when each cut is made, opening a visible slit. */
  slits: THREE.Vector3[];
  fallAt: number;
  land: number;
  burst: THREE.Vector3;
  /** Slow sideways glide while airborne. */
  drift: THREE.Vector3;
  sinkSpeed: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  phase2: number;
  yaw: number;
  /** Lands face up (+1) or face down (-1). */
  face: number;
  /** Scraps rarely end up perfectly flat: slight resting tilt around X and Z. */
  restX: number;
  restZ: number;
  floor: number;
}

const drag = (tau: number) => (1 - Math.exp(-3 * tau)) / 3;
/** Distance fallen by something light that quickly reaches its terminal speed. */
const sink = (tau: number) => tau - (1 - Math.exp(-2.2 * tau)) / 2.2;

/** Gives every scrap its own way of falling. A new seed makes each fight flutter differently. */
function buildPieces(seed: number): FallingPiece[] {
  const rng = mulberry32(seed);
  const pieces: FallingPiece[] = [];

  getCutLayers().forEach(({ cuts, quat, matrix, pieces: scraps }, layer) => {
    scraps.forEach((piece) => {
      const base = piece.centroid.clone().applyMatrix4(matrix);
      const slits = cuts.map((cut, i) =>
        new THREE.Vector3(-Math.sin(cut.angle), Math.cos(cut.angle), 0)
          .multiplyScalar(piece.sides[i] * SLIT * PAPER_SCALE)
          .applyQuaternion(quat),
      );
      const outward = new THREE.Vector2(piece.centroid.x, piece.centroid.y);
      if (outward.lengthSq() < 1e-4) outward.set(rng() - 0.5, rng() - 0.5);
      outward.normalize();
      const push = 0.6 + rng() * 0.9;

      const falling: FallingPiece = {
        geometry: piece.geometry,
        layer,
        base,
        baseQuat: quat,
        slits,
        fallAt: FALL_AT + rng() * 0.35 + layer * 0.05,
        land: 0,
        burst: new THREE.Vector3(outward.x * push, outward.y * push * 0.6 + 0.55, (rng() - 0.3) * 1.4),
        drift: new THREE.Vector3(outward.x * (0.05 + rng() * 0.22), 0, (rng() - 0.4) * 0.3),
        sinkSpeed: 0.36 + rng() * 0.4,
        sway: 0.18 + rng() * 0.24,
        swaySpeed: 2.0 + rng() * 1.5,
        phase: rng() * Math.PI * 2,
        phase2: rng() * Math.PI * 2,
        yaw: (rng() - 0.5) * 1.6,
        face: rng() > 0.5 ? 1 : -1,
        restX: (rng() - 0.5) * 0.5,
        restZ: (rng() - 0.5) * 0.5,
        floor: GROUND_Y + 0.03 + pieces.length * 0.004,
      };
      const startY = base.y + slits.reduce((sum, s) => sum + s.y, 0);
      falling.land = solveDecreasing(
        (tau) => startY + falling.burst.y * drag(tau) - falling.sinkSpeed * sink(tau) - falling.floor,
        0.25,
        30,
      );
      pieces.push(falling);
    });
  });
  return pieces;
}

/** Part of each cut line that actually crosses the sheet, as distances along the line. */
const TRAILS = SLASHES.map((s) => {
  const dx = Math.cos(s.angle);
  const dy = Math.sin(s.angle);
  let enter = -Infinity;
  let exit = Infinity;
  for (const [origin, dir, half] of [[s.through[0], dx, PAPER_W / 2], [s.through[1], dy, PAPER_H / 2]] as const) {
    if (Math.abs(dir) < 1e-6) continue;
    const a = (-half - origin) / dir;
    const b = (half - origin) / dir;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
  }
  return { ...s, dx, dy, enter, exit };
});

const point = [0, 0, 0];
const posed = [0, 0];
const IDENTITY = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

export function ScissorsVsPaper() {
  const pieces = useMemo(() => buildPieces(Math.floor(Math.random() * 1e9)), []);

  const scissors = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const trails = useRef<(THREE.Mesh | null)[]>([]);
  const scissorsShadow = useRef<THREE.Mesh>(null);
  const paperShadow = useRef<THREE.Mesh>(null);
  const scrapsShadow = useRef<THREE.Mesh>(null);
  const scratch = useMemo(() => ({ a: new THREE.Quaternion(), b: new THREE.Quaternion() }), []);

  useBattleFrame((t, clock) => {
    const intro = ease.outBack(seg(t, 0.05, 0.5));

    // --- Scissors
    if (scissors.current && front.current && back.current) {
      track(SCISSORS_PATH, t, point);
      track(SCISSORS_POSE, t, posed);
      const home = seg(t, BACK_HOME, BACK_HOME + 0.4);
      const victory = 0.3 * Math.abs(Math.sin(Math.PI * 2 * seg(t, BACK_HOME, BACK_HOME + 0.45)));
      const open = posed[1] + victory + home * 0.06 * Math.sin(t * 1.4);
      scissors.current.position.set(point[0], point[1] + home * 0.06 * Math.sin((t - BACK_HOME) * 1.6), point[2]);
      scissors.current.rotation.set(0, home * 0.3 * Math.sin((t - BACK_HOME) * 0.6), posed[0]);
      scissors.current.scale.setScalar(intro);
      front.current.rotation.z = -open;
      back.current.rotation.z = open;
      castBlobShadow(scissorsShadow.current, point[0], 0, point[1] - GROUND_Y - 0.7, 0.75 * intro);
    }

    // The sheet's shadow gives way to a wider, fainter one as the scraps settle.
    const fallen = seg(t, FALL_AT, FALL_AT + 1.2);
    castBlobShadow(paperShadow.current, FIGHT_X, 0, 0.6, 0.8 * intro, 0.5 * (1 - fallen));
    castBlobShadow(scrapsShadow.current, FIGHT_X, 0.2, 0, 1.7, 0.4 * seg(t, FALL_AT + 0.8, FALL_AT + 3.5));

    // --- Paper: held together with thin slits, then released
    const hover = (1 - seg(t, 0.8, 0.95)) * 0.06 * Math.sin(t * 1.5);
    let joltX = 0;
    let joltY = 0;
    const opened = SLASHES.map((s, i) => {
      const jolt = kick(t, cutTime(i), 10) * 0.05;
      joltX += Math.cos(s.angle) * jolt;
      joltY += Math.sin(s.angle) * jolt;
      return ease.outCubic(seg(t, cutTime(i), cutTime(i) + 0.15));
    });

    pieces.forEach((piece, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      let x = piece.base.x + joltX;
      let y = piece.base.y + joltY + hover;
      let z = piece.base.z;
      piece.slits.forEach((slit, k) => {
        x += slit.x * opened[k];
        y += slit.y * opened[k];
        z += slit.z * opened[k];
      });

      const tau = Math.min(Math.max(0, t - piece.fallAt), piece.land);
      // The sway builds up as the piece catches the air, and dies out near the floor.
      const air = smoothstep(tau / 0.4) * (1 - smoothstep((tau - (piece.land - 0.6)) / 0.6));
      const swing = Math.sin(piece.swaySpeed * tau + piece.phase);
      x += piece.burst.x * drag(tau) + piece.drift.x * tau + piece.sway * swing * air;
      y += piece.burst.y * drag(tau) - piece.sinkSpeed * sink(tau);
      z += piece.burst.z * drag(tau) + piece.drift.z * tau + piece.sway * 0.6 * Math.cos(piece.swaySpeed * tau + piece.phase2) * air;
      mesh.position.set(x, y, z);

      // Tips over to lie flat, rocking like a falling leaf on the way down.
      const flat = ease.inOutQuad(clamp01(tau / Math.min(0.9, piece.land)));
      const { a, b } = scratch;
      a.setFromAxisAngle(Y_AXIS, piece.yaw * tau);
      b.setFromAxisAngle(
        X_AXIS,
        ((-Math.PI / 2) * piece.face + piece.restX) * flat + 0.45 * air * Math.sin(piece.swaySpeed * tau + piece.phase2),
      );
      a.multiply(b);
      b.setFromAxisAngle(Z_AXIS, piece.restZ * flat - 0.5 * air * swing);
      a.multiply(b);
      b.copy(piece.baseQuat).slerp(IDENTITY, flat);
      mesh.quaternion.copy(a).multiply(b);
      mesh.scale.setScalar(PAPER_SCALE * intro);
    });

    // --- Bright streak following the blades along each cut
    TRAILS.forEach((trail, i) => {
      const mesh = trails.current[i];
      if (!mesh) return;
      const pivot = lerp(trail.from, trail.to, seg(t, trail.start, trail.end));
      const head = Math.min(Math.max((pivot + BLADE_REACH) / PAPER_SCALE, trail.enter), trail.exit);
      const length = head - trail.enter;
      const fade = 1 - seg(t, trail.end, trail.end + 0.28);
      mesh.visible = t >= trail.start && length > 0.01 && fade > 0;
      if (!mesh.visible) return;
      const mid = trail.enter + length / 2;
      mesh.position.set(trail.through[0] + trail.dx * mid, trail.through[1] + trail.dy * mid, 0.04);
      mesh.scale.set(length, 0.035, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = fade;
    });

    clock.shake = SLASHES.reduce((sum, _, i) => sum + 0.035 * decay(t, cutTime(i), 12), 0);
  });

  return (
    <group>
      <group ref={scissors} position={[-HOME_X, 0, 0]} rotation-z={-0.55}>
        <ScissorsBody frontRef={front} backRef={back} />
      </group>

      {pieces.map((piece, i) => (
        <mesh
          key={i}
          ref={(o) => {
            meshes.current[i] = o;
          }}
          geometry={piece.geometry}
          material={materials.paper(piece.layer)}
          position={piece.base}
          quaternion={piece.baseQuat}
          scale={PAPER_SCALE}
        />
      ))}

      <group position={PAPER_POSITION} quaternion={PAPER_QUAT} scale={PAPER_SCALE}>
        {TRAILS.map((trail, i) => (
          <mesh
            key={i}
            ref={(o) => {
              trails.current[i] = o;
              onFxLayer(o);
            }}
            geometry={getUnitPlane()}
            material={materials.trail(i)}
            rotation-z={trail.angle}
            visible={false}
            renderOrder={10}
          />
        ))}
      </group>

      <BlobShadow ref={scissorsShadow} slot="battle-a" />
      <BlobShadow ref={paperShadow} slot="battle-b" />
      <BlobShadow ref={scrapsShadow} slot="battle-c" />
    </group>
  );
}
