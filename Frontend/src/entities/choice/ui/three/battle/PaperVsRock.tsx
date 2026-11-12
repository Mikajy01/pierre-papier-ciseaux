import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getPaperTexture, getSoftTexture, PAPER_SCALE, PAPER_TILT } from '../geometry';
import { PaperBackSheets, RockMesh } from '../models';
import { fbm, mulberry32 } from '../noise';
import { useBattleFrame } from './clock';
import { Puffs, type Puff } from './fx';
import { FIGHT_X, GRAVITY, GROUND_Y, HOME_X, onFxLayer } from './stage';
import { clamp01, decay, ease, kick, landingTime, lerp, seg, solveDecreasing, track, type Key } from './timeline';
import { createWrapSheet, WRAP_RADIUS, type SheetState } from './wrapSheet';

/* -------------------------------- Timeline ------------------------------- */

const POUNCE = 1.22; // the sheet slaps onto the rock
const WRAP_START = 1.2;
const WRAP_END = 2.0;
const STRUGGLES = [2.05, 2.2, 2.34, 2.47]; // the rock punches from inside
const SQUEEZES = [2.6, 2.95, 3.3]; // the paper crushes it
const LIFT_START = 3.5;
const LIFT_END = 3.9;
const OPEN_START = 3.95;
const OPEN_END = 4.65;
const RETURN_START = 4.85;
const RETURN_END = 5.6;

export const PAPER_VS_ROCK_DURATION = 5.3;

/** The sheet grows as it pounces so it can swallow the whole rock. */
const ATTACK_SCALE = 1.45;
const ROCK_SCALE = 0.7;
/** How much each squeeze shrinks the ball. */
const SQUEEZE_STEPS = [0.16, 0.14, 0.18];
const CRUSHED = 1 - SQUEEZE_STEPS.reduce((a, b) => a + b, 0);
const LIFT = 0.85;

const ROCK = new THREE.Vector3(FIGHT_X, 0, 0);
const HOME = new THREE.Vector3(-HOME_X, 0, 0);
const quat = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

const Q_HOME = quat(...PAPER_TILT);
const Q_REAR = quat(-0.5, -0.5, 0.15); // rears up before pouncing
const Q_WRAP = quat(-0.2, -0.75, 0.1); // faces the rock from the front-left
const Q_OPEN = quat(-Math.PI / 2 + 0.45, 0, 0.3); // opening pointing down
const twist = (angle: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
const Q_TWISTED = Q_WRAP.clone().multiply(twist(0.5 * SQUEEZES.length));

/** Ball centre that puts the middle of the flat sheet on `sheetCentre`. */
const ballFor = (sheetCentre: THREE.Vector3, q: THREE.Quaternion, squeeze: number) =>
  sheetCentre.clone().sub(new THREE.Vector3(0, 0, WRAP_RADIUS * squeeze * PAPER_SCALE).applyQuaternion(q));
const BALL_HOME = ballFor(HOME, Q_HOME, 1);
const BALL_HOME_AFTER = ballFor(HOME, Q_HOME, CRUSHED);

const BALL_PATH: Key[] = [
  { t: 0.5, v: BALL_HOME.toArray() },
  { t: 0.8, v: [BALL_HOME.x - 0.15, BALL_HOME.y + 0.3, BALL_HOME.z], ease: ease.outQuad },
  { t: POUNCE, v: ROCK.toArray(), ease: ease.inCubic, arc: [0, 0.25, 0] },
  { t: LIFT_START, v: ROCK.toArray() },
  { t: LIFT_END, v: [ROCK.x, ROCK.y + LIFT, ROCK.z] },
  { t: RETURN_START, v: [ROCK.x, ROCK.y + LIFT, ROCK.z] },
  { t: RETURN_END, v: BALL_HOME_AFTER.toArray(), ease: ease.inOutCubic, arc: [0, 0.4, 0] },
];

const SCALE_PATH: Key[] = [
  { t: 0.5, v: [PAPER_SCALE] },
  { t: WRAP_START, v: [ATTACK_SCALE] },
  { t: RETURN_START, v: [ATTACK_SCALE] },
  { t: RETURN_END, v: [PAPER_SCALE], ease: ease.inOutCubic },
];

const QUAT_PATH = [
  { t: 0.5, q: Q_HOME },
  { t: 0.8, q: Q_REAR },
  { t: POUNCE, q: Q_WRAP },
  { t: LIFT_START, q: Q_TWISTED },
  { t: LIFT_END, q: Q_OPEN },
  { t: RETURN_START, q: Q_OPEN },
  { t: RETURN_END, q: Q_HOME },
];

function orientation(t: number, out: THREE.Quaternion) {
  // While squeezing, the ball is wrung a little further each time.
  if (t >= POUNCE && t <= LIFT_START) {
    const wrung = SQUEEZES.reduce((sum, at) => sum + 0.5 * ease.outCubic(seg(t, at, at + 0.2)), 0);
    return out.copy(Q_WRAP).multiply(twist(wrung));
  }
  for (let i = 1; i < QUAT_PATH.length; i++) {
    if (t > QUAT_PATH[i].t) continue;
    const a = QUAT_PATH[i - 1];
    const b = QUAT_PATH[i];
    return out.copy(a.q).slerp(b.q, ease.inOutQuad(seg(t, a.t, b.t)));
  }
  return out.copy(Q_HOME);
}

const squeezeAt = (t: number) =>
  SQUEEZES.reduce(
    (k, at, i) => k - SQUEEZE_STEPS[i] * ease.inCubic(seg(t, at, at + 0.1)) + 0.03 * kick(t, at + 0.1, 12),
    1,
  );

const STRUGGLE_DIRS = [
  new THREE.Vector3(0.6, 0.5, 0.62),
  new THREE.Vector3(-0.7, -0.2, 0.68),
  new THREE.Vector3(0.1, -0.75, 0.65),
  new THREE.Vector3(-0.35, 0.7, 0.62),
].map((v) => v.normalize());

/* ----------------------------- Rubble and dust ---------------------------- */

const DROP = new THREE.Vector3(ROCK.x, ROCK.y + LIFT - 0.1, ROCK.z);
/** Height of the heap of rubble at a given distance from its centre. */
const heap = (distance: number) => 0.3 * Math.exp(-Math.pow(distance / 0.6, 2));

/** Lumpy mound the rubble piles up into. */
function buildHeap() {
  const geometry = new THREE.IcosahedronGeometry(1, 4);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    v.multiplyScalar(1 + 0.32 * fbm(v.x * 2.6, v.y * 2.6, v.z * 2.6, 71, 3));
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const GRAVEL_COUNT = 56;
const DUST_COUNT = 460;
const DUST_SINK = 2.4; // drag makes dust reach its falling speed quickly
const dustFall = (tau: number) => tau - (1 - Math.exp(-DUST_SINK * tau)) / DUST_SINK;

function buildRubble() {
  const rng = mulberry32(13);
  const disc = (radius: number) => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius;
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  };

  const gravel = Array.from({ length: GRAVEL_COUNT }, () => {
    const [ox, oz] = disc(0.34);
    const size = 0.045 + rng() * rng() * 0.15;
    const start = new THREE.Vector3(DROP.x + ox, DROP.y + (rng() - 0.5) * 0.2, DROP.z + oz);
    const velocity = new THREE.Vector3(ox * 2.2 + (rng() - 0.5) * 0.5, -rng() * 0.6, oz * 2.2 + (rng() - 0.5) * 0.5);
    // Land on the heap: estimate where it comes down, then settle on top of it.
    const roughLanding = landingTime(start.y, velocity.y, GRAVITY, GROUND_Y);
    const lx = start.x + velocity.x * roughLanding - DROP.x;
    const lz = start.z + velocity.z * roughLanding - DROP.z;
    const floor = GROUND_Y + heap(Math.hypot(lx, lz)) * (0.4 + rng() * 0.6) + size * 0.45;
    return {
      at: OPEN_START + 0.05 + rng() * 0.5,
      start,
      velocity,
      land: landingTime(start.y, velocity.y, GRAVITY, floor),
      size,
      spin: new THREE.Vector3(rng() * 10 - 5, rng() * 10 - 5, rng() * 10 - 5),
      shade: 0.55 + rng() * 0.6,
    };
  });

  const dust = Array.from({ length: DUST_COUNT }, () => {
    const [ox, oz] = disc(0.34);
    const [dx, dz] = disc(0.7);
    const start = new THREE.Vector3(DROP.x + ox, DROP.y + (rng() - 0.5) * 0.3, DROP.z + oz);
    const speed = 2.1 + rng() * 1.7;
    const floor = GROUND_Y + heap(Math.hypot(ox + dx, oz + dz)) * rng() + 0.02;
    return {
      // Pours out for a while, most of it early on.
      at: OPEN_START + 0.05 + Math.pow(rng(), 1.6) * 0.85,
      start,
      drift: new THREE.Vector3(dx, 0, dz),
      speed,
      land: solveDecreasing((tau) => start.y - speed * dustFall(tau) - floor, 0, 20),
      floor,
      shade: 0.45 + rng() * 0.5,
    };
  });

  return { gravel, dust };
}

const PUFFS: Puff[] = [
  ...SQUEEZES.map((at, i) => ({
    t: at + 0.08,
    at: [ROCK.x, ROCK.y, ROCK.z + 0.3] as const,
    count: 5,
    spread: 1.5 - i * 0.25,
    rise: 0.25,
    size: 0.5,
    life: 0.55,
    opacity: 0.4,
  })),
  { t: OPEN_START + 0.45, at: [ROCK.x, GROUND_Y + 0.12, 0.2], count: 9, spread: 1.3, rise: 0.4, size: 0.9, life: 1.5, opacity: 0.34 },
  { t: OPEN_START + 0.8, at: [ROCK.x, GROUND_Y + 0.15, 0.1], count: 7, spread: 1.0, rise: 0.5, size: 0.8, life: 1.6, opacity: 0.26 },
];

const point = [0, 0, 0];
const scalar = [0];

export function PaperVsRock() {
  const sheet = useMemo(createWrapSheet, []);
  const rubble = useMemo(buildRubble, []);
  const texture = useMemo(getPaperTexture, []);
  const soft = useMemo(getSoftTexture, []);
  const heapGeometry = useMemo(buildHeap, []);
  useEffect(
    () => () => {
      sheet.geometry.dispose();
      heapGeometry.dispose();
    },
    [sheet, heapGeometry],
  );

  const paper = useRef<THREE.Group>(null);
  const stack = useRef<THREE.Group>(null);
  const rock = useRef<THREE.Mesh>(null);
  const gravel = useRef<THREE.InstancedMesh>(null);
  const dust = useRef<THREE.Points>(null);
  const heapMesh = useRef<THREE.Mesh>(null);

  const dustGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const colors = new Float32Array(DUST_COUNT * 3);
    rubble.dust.forEach((grain, i) => colors.set([0.62 * grain.shade, 0.6 * grain.shade, 0.56 * grain.shade], i * 3));
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_COUNT * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [rubble]);
  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);

  useLayoutEffect(() => {
    onFxLayer(dust.current);
    const im = gravel.current;
    if (!im) return;
    const color = new THREE.Color();
    rubble.gravel.forEach((chunk, i) => im.setColorAt(i, color.setRGB(0.3 * chunk.shade, 0.29 * chunk.shade, 0.27 * chunk.shade)));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [rubble]);

  const scratch = useMemo(
    () => ({
      q: new THREE.Quaternion(),
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      e: new THREE.Euler(),
      state: { wrap: 0, squeeze: 1, crumple: 0, relax: 1, flap: 0, time: 0, bumps: [] } as SheetState,
      bumps: STRUGGLE_DIRS.map((dir) => ({ dir, height: 0 })),
    }),
    [],
  );

  useBattleFrame((t, clock) => {
    const intro = ease.outBack(seg(t, 0.05, 0.5));
    const wrap = ease.inOutQuad(seg(t, WRAP_START, WRAP_END)) * (1 - ease.inOutCubic(seg(t, OPEN_START, OPEN_END)));
    const squeeze = squeezeAt(t);
    const squeezed = SQUEEZES.map((at) => ease.outCubic(seg(t, at, at + 0.15)));
    const struggling = seg(t, WRAP_END, WRAP_END + 0.1) * (1 - seg(t, SQUEEZES[0], SQUEEZES[0] + 0.1));

    // --- Paper sheet
    if (paper.current) {
      track(BALL_PATH, t, point);
      track(SCALE_PATH, t, scalar);
      const tremble = 0.03 * struggling + SQUEEZES.reduce((sum, at) => sum + 0.06 * decay(t, at + 0.1, 10), 0);
      const home = seg(t, RETURN_END, RETURN_END + 0.5);
      paper.current.position.set(
        point[0] + tremble * Math.sin(t * 61),
        point[1] + tremble * Math.cos(t * 53) + home * 0.06 * Math.sin((t - RETURN_END) * 1.6),
        point[2],
      );
      orientation(t, paper.current.quaternion);
      paper.current.scale.setScalar(scalar[0] * intro);

      const { state, bumps } = scratch;
      STRUGGLES.forEach((at, i) => {
        bumps[i].height = 0.2 * Math.sin(Math.PI * seg(t, at, at + 0.2));
      });
      state.wrap = wrap;
      state.squeeze = squeeze;
      state.crumple =
        (0.03 * seg(t, WRAP_START, WRAP_END) + 0.02 * squeezed[0] + 0.025 * squeezed[1] + 0.03 * squeezed[2]) *
        lerp(1, 0.7, seg(t, OPEN_START, OPEN_END));
      state.relax = 1 - seg(t, 0.6, WRAP_START) + seg(t, RETURN_START, RETURN_END);
      state.flap = Math.sin(Math.PI * seg(t, 0.5, POUNCE)) + Math.sin(Math.PI * seg(t, RETURN_START, RETURN_END));
      state.time = t;
      state.bumps = wrap > 0.99 ? bumps : [];
      sheet.update(state);
    }

    if (stack.current) {
      stack.current.position.y = 0.05 * Math.sin(t * 1.5);
      stack.current.scale.setScalar(PAPER_SCALE * intro);
    }

    // --- Rock: flinches, shakes while being wrapped, then is never seen whole again
    if (rock.current) {
      const flinch = ease.outCubic(seg(t, 0.95, POUNCE));
      const panic = seg(t, WRAP_START, WRAP_START + 0.2) * 0.03;
      rock.current.visible = t < WRAP_END - 0.03;
      rock.current.position.set(ROCK.x + panic * Math.sin(t * 67), ROCK.y + panic * Math.cos(t * 59) + (1 - flinch) * 0.05 * Math.sin(t * 1.6), ROCK.z);
      rock.current.rotation.set(0.15, 0.35 * t, 0.12 * flinch);
      rock.current.scale.setScalar(ROCK_SCALE * intro);
    }

    // --- Gravel tumbling out of the opening sheet
    if (gravel.current) {
      const { m, p, q, s, e } = scratch;
      rubble.gravel.forEach((chunk, i) => {
        const tau = Math.min(t - chunk.at, chunk.land);
        if (tau < 0) {
          m.makeScale(0, 0, 0);
        } else {
          p.set(
            chunk.start.x + chunk.velocity.x * tau,
            chunk.start.y + chunk.velocity.y * tau - 0.5 * GRAVITY * tau * tau,
            chunk.start.z + chunk.velocity.z * tau,
          );
          q.setFromEuler(e.set(chunk.spin.x * tau, chunk.spin.y * tau, chunk.spin.z * tau));
          m.compose(p, q, s.setScalar(chunk.size));
        }
        gravel.current!.setMatrixAt(i, m);
      });
      gravel.current.instanceMatrix.needsUpdate = true;
    }

    // --- Dust pouring down and piling up
    {
      const position = dustGeometry.attributes.position as THREE.BufferAttribute;
      rubble.dust.forEach((grain, i) => {
        const tau = t - grain.at;
        if (tau < 0) {
          position.setXYZ(i, 0, -50, 0);
          return;
        }
        const fall = Math.min(tau, grain.land);
        const spread = clamp01(fall / grain.land);
        position.setXYZ(
          i,
          grain.start.x + grain.drift.x * spread,
          Math.max(grain.floor, grain.start.y - grain.speed * dustFall(fall)),
          grain.start.z + grain.drift.z * spread,
        );
      });
      position.needsUpdate = true;
    }

    if (heapMesh.current) {
      const grown = ease.outCubic(seg(t, OPEN_START + 0.4, OPEN_START + 1.3));
      heapMesh.current.visible = grown > 0;
      heapMesh.current.scale.set(0.58 * grown, 0.24 * grown, 0.44 * grown);
    }

    clock.shake = SQUEEZES.reduce((sum, at) => sum + 0.06 * decay(t, at + 0.1, 9), 0) + 0.05 * decay(t, POUNCE, 10);
  });

  return (
    <group>
      {/* The rest of the stack waits at home while its top sheet goes to fight. */}
      <group ref={stack} position={HOME} rotation={[...PAPER_TILT]} scale={PAPER_SCALE}>
        <PaperBackSheets />
      </group>

      <group ref={paper} position={BALL_HOME} quaternion={Q_HOME} scale={PAPER_SCALE}>
        <mesh geometry={sheet.geometry} frustumCulled={false}>
          <meshStandardMaterial map={texture} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <RockMesh ref={rock} position={ROCK} scale={ROCK_SCALE} />

      <instancedMesh ref={gravel} args={[undefined, undefined, GRAVEL_COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>

      <points ref={dust} geometry={dustGeometry} frustumCulled={false}>
        <pointsMaterial map={soft} size={0.095} sizeAttenuation vertexColors transparent alphaTest={0.05} depthWrite={false} />
      </points>

      <mesh ref={heapMesh} geometry={heapGeometry} position={[ROCK.x, GROUND_Y + 0.02, ROCK.z]} visible={false}>
        <meshStandardMaterial color="#5d5a55" roughness={1} flatShading />
      </mesh>

      <Puffs puffs={PUFFS} />
    </group>
  );
}
