import type * as THREE from 'three';
import { GROUND_Y } from './geometry';

/**
 * Moves a blob shadow under an object: the higher the object, the wider and fainter the shadow.
 * @param radius footprint of the object on the floor
 */
export function castBlobShadow(
  shadow: THREE.Mesh | null,
  x: number,
  z: number,
  height: number,
  radius: number,
  strength = 0.5,
) {
  if (!shadow) return;
  const lift = Math.max(0, height);
  const size = radius * 2 * (1 + lift * 0.3);
  shadow.visible = strength > 0.005 && radius > 0.005;
  shadow.position.set(x, GROUND_Y, z);
  shadow.scale.set(size, size * 0.62, 1);
  (shadow.material as THREE.MeshBasicMaterial).opacity = strength / (1 + lift * 0.8);
}
