import * as THREE from 'three';
import { ACCENT, getPaperTexture, getSoftTexture, PAPER_STACK } from './geometry';

/**
 * Every material of the 3D scenes, created once and never disposed.
 * Keeping them alive keeps their compiled shader programs alive too, so a scene that
 * mounts again (next round, rematch…) starts drawing immediately.
 */

const cache = new Map<string, THREE.Material>();
function once<T extends THREE.Material>(key: string, create: () => T): T {
  let material = cache.get(key) as T | undefined;
  if (!material) cache.set(key, (material = create()));
  return material;
}

const steel = () =>
  new THREE.MeshStandardMaterial({ color: '#eef1f4', metalness: 0.92, roughness: 0.22, envMapIntensity: 1.6 });
const overlay = { transparent: true, depthWrite: false, toneMapped: false } as const;

export const materials = {
  /* Models */
  rock: () => once('rock', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 })),
  steel: () => once('steel', steel),
  /** Separate steel for the scissors that get smashed: it is scuffed during the fight. */
  battleSteel: () => once('battle-steel', steel),
  handle: () => once('handle', () => new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.26, envMapIntensity: 1.3 })),
  screw: () => once('screw', () => new THREE.MeshStandardMaterial({ color: '#9ea3ab', metalness: 1, roughness: 0.25 })),
  /** Sheet `layer` of the paper stack: 0 is the printed top sheet. */
  paper: (layer: number) =>
    once(`paper-${layer}`, () =>
      layer === 0
        ? new THREE.MeshStandardMaterial({ map: getPaperTexture(), roughness: 0.78, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: PAPER_STACK[layer].color, roughness: 0.85, side: THREE.DoubleSide }),
    ),
  orb: () => once('orb', () => new THREE.MeshStandardMaterial({ color: '#1c1c1f', metalness: 0.9, roughness: 0.12 })),
  cage: () => once('cage', () => new THREE.MeshBasicMaterial({ color: '#52525b', wireframe: true, opacity: 0.6, ...overlay })),

  /* Rubble */
  gravel: () => once('gravel', () => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true })),
  heap: () => once('heap', () => new THREE.MeshStandardMaterial({ color: '#5d5a55', roughness: 1, flatShading: true })),
  dust: () =>
    once(
      'dust',
      () =>
        new THREE.PointsMaterial({
          map: getSoftTexture(),
          size: 0.095,
          sizeAttenuation: true,
          vertexColors: true,
          transparent: true,
          alphaTest: 0.05,
          depthWrite: false,
        }),
    ),

  /* Effects. Those that fade individually come from a pool: slot `i` is always the same instance. */
  spark: () => once('spark', () => new THREE.MeshBasicMaterial({ color: '#ffe1b3', toneMapped: false })),
  flash: (i: number) =>
    once(`flash-${i}`, () => new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, ...overlay })),
  glow: (i: number) =>
    once(`glow-${i}`, () => new THREE.SpriteMaterial({ map: getSoftTexture(), color: '#fff1d6', depthTest: false, ...overlay })),
  puff: (i: number) => once(`puff-${i}`, () => new THREE.SpriteMaterial({ map: getSoftTexture(), color: '#6f6a62', ...overlay })),
  trail: (i: number) => once(`trail-${i}`, () => new THREE.MeshBasicMaterial({ color: '#ffffff', ...overlay })),
  /** Soft dark blob drawn under an object. `slot` distinguishes shadows that fade independently. */
  shadow: (slot: string | number = 'static') =>
    once(`shadow-${slot}`, () => new THREE.MeshBasicMaterial({ map: getSoftTexture(), color: '#000000', opacity: 0.5, ...overlay })),
};
