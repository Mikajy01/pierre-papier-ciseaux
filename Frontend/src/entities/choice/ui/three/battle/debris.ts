import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import { ballistic, landingTime, smoothstep } from './timeline';
import { GRAVITY, GROUND_Y } from './stage';

const m = new Matrix4();
const q = new Quaternion();
const e = new Euler();

type DebrisOptions = {
  /** Time the piece breaks off. */
  at: number;
  velocity: [number, number, number];
  /** Tumbling speed in rad/s around each axis. */
  spin: [number, number, number];
  /** Orientation once it lies on the floor. */
  rest: [number, number, number];
  /** Height of its centre above the floor when resting. */
  clearance?: number;
};

/**
 * A piece that breaks off a rig, flies ballistically and comes to rest on the floor.
 * `capture` snapshots where the piece is at the moment it breaks.
 */
export class Debris {
  readonly at: number;
  private readonly v0: Vector3;
  private readonly spin: Vector3;
  private readonly restQuat: Quaternion;
  private readonly clearance: number;
  private readonly p0 = new Vector3();
  private readonly q0 = new Quaternion();
  private readonly s0 = new Vector3(1, 1, 1);
  private land = 0;

  constructor({ at, velocity, spin, rest, clearance = 0.04 }: DebrisOptions) {
    this.at = at;
    this.v0 = new Vector3(...velocity);
    this.spin = new Vector3(...spin);
    this.restQuat = new Quaternion().setFromEuler(new Euler(...rest));
    this.clearance = clearance;
  }

  /** Records the pose of `anchor` expressed in the coordinates of `space`. */
  capture(anchor: Object3D, space: Object3D) {
    space.updateWorldMatrix(true, true);
    m.copy(space.matrixWorld).invert().multiply(anchor.matrixWorld);
    m.decompose(this.p0, this.q0, this.s0);
    this.land = landingTime(this.p0.y, this.v0.y, GRAVITY, GROUND_Y + this.clearance);
  }

  apply(target: Object3D, t: number) {
    const tau = t - this.at;
    target.visible = tau >= 0;
    if (tau < 0) return;
    const flight = ballistic(target.position, this.p0, this.v0, GRAVITY, tau, this.land);
    e.set(this.spin.x * flight, this.spin.y * flight, this.spin.z * flight);
    q.setFromEuler(e).multiply(this.q0);
    // Flatten onto the floor just before touching down.
    target.quaternion.copy(q).slerp(this.restQuat, smoothstep((flight - (this.land - 0.12)) / 0.12));
    target.scale.copy(this.s0);
  }
}
