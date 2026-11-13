import type { Ref } from 'react';
import type * as THREE from 'three';
import { getUnitPlane, GROUND_Y } from './geometry';
import { materials } from './materials';

type Props = {
  ref?: Ref<THREE.Mesh>;
  /** Material slot. Shadows sharing a slot share their opacity; leave empty for a static shadow. */
  slot?: string | number;
  x?: number;
  z?: number;
  /** Diameter on the floor. */
  size?: number;
};

/**
 * Cheap stand-in for a real shadow: a soft dark blob on the floor.
 * It costs one textured quad, where a rendered contact shadow costs an extra pass over the scene.
 */
export function BlobShadow({ ref, slot, x = 0, z = 0, size = 2.6 }: Props) {
  return (
    <mesh
      ref={ref}
      geometry={getUnitPlane()}
      material={materials.shadow(slot)}
      position={[x, GROUND_Y, z]}
      rotation-x={-Math.PI / 2}
      scale={[size, size * 0.62, 1]}
      renderOrder={-1}
    />
  );
}
