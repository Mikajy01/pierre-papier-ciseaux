import * as THREE from 'three';
import { PAPER_SCALE, PAPER_STACK, PAPER_TILT } from '../geometry';
import { lerp } from './timeline';
import { cutSheet, type CutLine, type PaperPiece } from './paperPieces';
import { FIGHT_X } from './stage';

/** Where the scissors slash the paper, and the sheets sliced accordingly. */

const deg = (d: number) => (d * Math.PI) / 180;

/**
 * Four slashes across the sheet. `from`/`to` are how far (world units, along the cut)
 * the pivot of the scissors starts before and stops after the point it cuts through.
 */
export const SLASHES = [
  { through: [0, 0.25], angle: deg(-35), start: 0.95, end: 1.13, from: -2.0, to: 0.7 },
  { through: [0.05, 0.1], angle: deg(215), start: 1.38, end: 1.56, from: -2.0, to: 0.7 },
  { through: [0, -0.35], angle: deg(4), start: 1.8, end: 1.98, from: -1.9, to: 0.6 },
  { through: [0.12, 0], angle: deg(-86), start: 2.22, end: 2.4, from: -2.0, to: 0.25 },
] as const;

/** A cut is complete once the tips of the blades leave the sheet. */
export const cutTime = (i: number) => lerp(SLASHES[i].start, SLASHES[i].end, 0.75);
/** After the last slash the sheet holds for a beat, then falls apart. */
export const FALL_AT = 2.55;
export const BACK_HOME = 3.05;

/** Half the width of the slit left by a cut, in sheet units. */
export const SLIT = 0.018;
export const SLASH_Z = 0.3;

export const PAPER_POSITION = new THREE.Vector3(FIGHT_X, 0, 0);
export const PAPER_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(...PAPER_TILT));
export const PAPER_MATRIX = new THREE.Matrix4().compose(
  PAPER_POSITION,
  PAPER_QUAT,
  new THREE.Vector3(PAPER_SCALE, PAPER_SCALE, PAPER_SCALE),
);

/** Sheet point `distance` world units along slash `i`, lifted in front of the paper. */
export function slashPoint(i: number, distance: number) {
  const s = SLASHES[i];
  const u = distance / PAPER_SCALE;
  return new THREE.Vector3(
    s.through[0] + Math.cos(s.angle) * u,
    s.through[1] + Math.sin(s.angle) * u,
    SLASH_Z / PAPER_SCALE,
  ).applyMatrix4(PAPER_MATRIX);
}

interface CutLayer {
  cuts: CutLine[];
  quat: THREE.Quaternion;
  matrix: THREE.Matrix4;
  pieces: PaperPiece[];
}

let cutLayers: CutLayer[] | null = null;
/** The three sheets of the stack, sliced along the slashes. Slicing is costly, so it is done once. */
export function getCutLayers() {
  cutLayers ??= PAPER_STACK.map((sheet) => {
    // Express the cuts in the coordinates of this sheet of the stack.
    const cos = Math.cos(-sheet.rotationZ);
    const sin = Math.sin(-sheet.rotationZ);
    const cuts: CutLine[] = SLASHES.map((s) => {
      const x = s.through[0] - sheet.offset[0];
      const y = s.through[1] - sheet.offset[1];
      return { through: [x * cos - y * sin, x * sin + y * cos], angle: s.angle - sheet.rotationZ };
    });
    const sheetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sheet.rotationZ);
    return {
      cuts,
      quat: PAPER_QUAT.clone().multiply(sheetQuat),
      matrix: PAPER_MATRIX.clone().multiply(
        new THREE.Matrix4().compose(new THREE.Vector3(...sheet.offset), sheetQuat, new THREE.Vector3(1, 1, 1)),
      ),
      pieces: cutSheet(cuts),
    };
  });
  return cutLayers;
}
