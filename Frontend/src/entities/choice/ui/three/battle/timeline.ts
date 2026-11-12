import type { Vector3 } from 'three';

/**
 * Animation helpers. Every battle is a pure function of time: given `t` the whole scene
 * can be posed, which keeps the choreography deterministic and frame-rate independent.
 */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progress of `t` through [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smoothstep = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

export type Ease = (x: number) => number;

export const ease = {
  linear: (x: number) => x,
  inQuad: (x: number) => x * x,
  outQuad: (x: number) => 1 - (1 - x) * (1 - x),
  inOutQuad: (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  inCubic: (x: number) => x * x * x,
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
} satisfies Record<string, Ease>;

/** 1 at `t0`, decaying exponentially afterwards; 0 before. */
export const decay = (t: number, t0: number, rate = 8) => (t < t0 ? 0 : Math.exp(-rate * (t - t0)));

/** Recoil pulse: 0 at `t0`, quickly rises to ~1, then fades. */
export const kick = (t: number, t0: number, rate = 6) => {
  const d = t - t0;
  return d < 0 ? 0 : (Math.exp(-rate * d) - Math.exp(-rate * 6 * d)) * 1.72;
};

export interface Key {
  t: number;
  v: readonly number[];
  /** Easing of the segment that ends on this key. */
  ease?: Ease;
  /** Extra offset added at the middle of the segment that ends on this key. */
  arc?: readonly number[];
}

/** Piecewise keyframe interpolation. */
export function track(keys: readonly Key[], t: number, out: number[]): number[] {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (t <= first.t) {
    for (let j = 0; j < first.v.length; j++) out[j] = first.v[j];
    return out;
  }
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t > k.t) continue;
    const p = keys[i - 1];
    const raw = (t - p.t) / (k.t - p.t);
    const s = (k.ease ?? ease.inOutQuad)(raw);
    const bulge = k.arc ? Math.sin(Math.PI * raw) : 0;
    for (let j = 0; j < k.v.length; j++) out[j] = lerp(p.v[j], k.v[j], s) + (k.arc ? k.arc[j] * bulge : 0);
    return out;
  }
  for (let j = 0; j < last.v.length; j++) out[j] = last.v[j];
  return out;
}

/** Seconds a projectile launched from height `y0` with vertical speed `vy` takes to reach `groundY`. */
export function landingTime(y0: number, vy: number, gravity: number, groundY: number) {
  const drop = y0 - groundY;
  if (drop <= 0) return 0;
  return (vy + Math.sqrt(vy * vy + 2 * gravity * drop)) / gravity;
}

/** Ballistic position that stops when it lands. Returns the effective flight time. */
export function ballistic(out: Vector3, p0: Vector3, v0: Vector3, gravity: number, tau: number, land: number) {
  const s = Math.min(Math.max(tau, 0), land);
  out.set(p0.x + v0.x * s, p0.y + v0.y * s - 0.5 * gravity * s * s, p0.z + v0.z * s);
  return s;
}

/** Root of a decreasing function on [lo, hi] by bisection. */
export function solveDecreasing(f: (x: number) => number, lo: number, hi: number) {
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
