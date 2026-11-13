import * as THREE from 'three';

/**
 * Light rig shared by every scene. All scenes use the exact same set of lights, which
 * lets them share the same compiled shaders.
 */
export const LIGHTS = {
  ambient: 0.25,
  key: { position: [3, 5, 4], intensity: 1.6, color: '#ffffff' },
  fill: { position: [-4, 2, -3], intensity: 0.6, color: '#ffd9c7' },
} as const;

/** Reflection environment, rendered once for the whole stage. */
let environment: THREE.Texture | null = null;
export const setEnvironment = (texture: THREE.Texture) => {
  environment = texture;
};
export const getEnvironment = () => environment;

/** Same rig as <StudioLights />, for a scene built by hand. */
export function addStudioLights(scene: THREE.Scene) {
  scene.environment = environment;
  scene.add(new THREE.AmbientLight('#ffffff', LIGHTS.ambient));
  for (const spec of [LIGHTS.key, LIGHTS.fill]) {
    const light = new THREE.DirectionalLight(spec.color, spec.intensity);
    light.position.set(spec.position[0], spec.position[1], spec.position[2]);
    scene.add(light);
  }
}
