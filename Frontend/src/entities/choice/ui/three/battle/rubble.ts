import * as THREE from 'three';
import { mulberry32 } from '../noise';

/** Number of stone chunks and dust grains left when the rock is crushed. */
export const GRAVEL_COUNT = 56;
export const DUST_COUNT = 460;

let dustGeometry: THREE.BufferGeometry | null = null;
/** Point cloud of the dust. Positions are rewritten every frame; the greys are fixed. */
export function getDustGeometry() {
  if (dustGeometry) return dustGeometry;
  const rng = mulberry32(29);
  const colors = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    const shade = 0.45 + rng() * 0.5;
    colors.set([0.62 * shade, 0.6 * shade, 0.56 * shade], i * 3);
  }
  const positions = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) positions[i * 3 + 1] = -50; // parked out of sight
  dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return dustGeometry;
}
