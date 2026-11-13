import * as THREE from 'three';
import { PAPER_H, PAPER_W, paperBend } from '../geometry';
import { fbm } from '../noise';
import { clamp01, smoothstep } from './timeline';

/**
 * A paper sheet that can wrap itself around a ball.
 *
 * The ball sits at the origin and the sheet starts flat, resting on the ball's +Z pole.
 * As `wrap` goes from 0 to 1 a contact front sweeps from the pole towards the back:
 * everything behind the front hugs the sphere, everything ahead of it stays a straight
 * flap tangent to the sphere, so the paper never cuts through what it is wrapping.
 */

/** Radius of the wrapped ball, in sheet units. */
export const WRAP_RADIUS = 0.62;
/** Polar angle reached by the edges of the sheet once fully wrapped. */
const THETA_MAX = 2.75;

const COLUMNS = 44;
const ROWS = 58;

export interface SheetState {
  /** 0 = flat sheet, 1 = closed around the ball. */
  wrap: number;
  /** Radius multiplier; below 1 the ball is being crushed. */
  squeeze: number;
  /** Strength of the creases. */
  crumple: number;
  /** How much of the resting bend of a pristine sheet remains (0..1). */
  relax: number;
  /** Amplitude of the travelling wave while the sheet flies. */
  flap: number;
  time: number;
  /** Bulges pushed out from inside: unit direction + height. */
  bumps: readonly { dir: THREE.Vector3; height: number }[];
}

function createWrapSheet() {
  const geometry = new THREE.PlaneGeometry(PAPER_W, PAPER_H, COLUMNS, ROWS);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const count = position.count;

  const xs = new Float32Array(count);
  const ys = new Float32Array(count);
  const radius = new Float32Array(count);
  const cos = new Float32Array(count);
  const sin = new Float32Array(count);
  const edge = new Float32Array(count);
  const theta = new Float32Array(count);
  const crease = new Float32Array(count);
  const stagger = new Float32Array(count);
  const lump = new Float32Array(count);
  const bend = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const r = Math.hypot(x, y);
    const c = r > 1e-6 ? x / r : 1;
    const s = r > 1e-6 ? y / r : 0;
    // Distance from the centre to the border of the sheet in this direction.
    const toEdge = Math.min(
      Math.abs(c) > 1e-6 ? PAPER_W / 2 / Math.abs(c) : Infinity,
      Math.abs(s) > 1e-6 ? PAPER_H / 2 / Math.abs(s) : Infinity,
    );
    xs[i] = x;
    ys[i] = y;
    radius[i] = r;
    cos[i] = c;
    sin[i] = s;
    edge[i] = toEdge;
    theta[i] = (r / toEdge) * THETA_MAX;
    // Sharp ridges plus fine grain, mostly pushing outwards.
    const ridges = 1 - 2 * Math.abs(fbm(x * 3.1, y * 3.1, 0.5, 31, 3));
    crease[i] = 0.35 + 0.7 * ridges + 0.45 * fbm(x * 9, y * 9, 2.5, 47, 3);
    // Uneven contact front so the wrap does not look mechanical.
    stagger[i] = clamp01(0.5 + fbm(c * 1.7, s * 1.7, 7.5, 53, 2));
    bend[i] = paperBend(x, y);
    // Once wrapped, the paper follows the uneven shape of what is inside.
    const st = Math.sin(theta[i]);
    lump[i] = fbm(st * c * 1.5, st * s * 1.5, Math.cos(theta[i]) * 1.5, 61, 3);
  }

  function update(state: SheetState) {
    const R = WRAP_RADIUS * state.squeeze;
    for (let i = 0; i < count; i++) {
      const progress = clamp01(state.wrap * 1.25 - 0.25 * stagger[i]);
      const front = THETA_MAX * progress;
      let px: number, py: number, pz: number;
      // Direction the surface faces at this vertex.
      let nx: number, ny: number, nz: number;
      let lift = state.crumple * crease[i];

      if (theta[i] <= front) {
        const st = Math.sin(theta[i]);
        nx = st * cos[i];
        ny = st * sin[i];
        nz = Math.cos(theta[i]);
        px = R * nx;
        py = R * ny;
        pz = R * nz;
        lift += R * 0.3 * lump[i];
        for (const bump of state.bumps) {
          const facing = nx * bump.dir.x + ny * bump.dir.y + nz * bump.dir.z;
          lift += bump.height * Math.exp((facing - 1) / 0.14);
        }
      } else {
        const sf = Math.sin(front);
        const cf = Math.cos(front);
        const free = radius[i] - progress * edge[i];
        const rho = R * sf + cf * free;
        px = rho * cos[i];
        py = rho * sin[i];
        pz = R * cf - sf * free;
        nx = sf * cos[i];
        ny = sf * sin[i];
        nz = cf;
        // The loose flap keeps its natural bend and ripples in the air.
        const loose = progress > 0 ? smoothstep(free / 0.25) : 1;
        lift += loose * (bend[i] * state.relax + state.flap * 0.07 * Math.sin(2.6 * ys[i] + 1.3 * xs[i] - 13 * state.time));
      }
      position.setXYZ(i, px + nx * lift, py + ny * lift, pz + nz * lift);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  return { geometry, update };
}

let shared: ReturnType<typeof createWrapSheet> | null = null;
/** The sheet is built once and reused by every fight (only one fight runs at a time). */
export function getWrapSheet() {
  shared ??= createWrapSheet();
  return shared;
}
