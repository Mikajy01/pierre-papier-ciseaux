import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { ACCENT } from './geometry';
import { getEnvironment, LIGHTS } from './lighting';

/**
 * Produces the reflection environment. It is expensive, so it is rendered a single time at
 * the root of the stage and then handed to each scene by <StudioLights />.
 */
export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <group rotation={[-Math.PI / 3, 0, 1]}>
        <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
        <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
        <Lightformer form="rect" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[10, 1, 1]} />
        <Lightformer form="rect" intensity={3} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1.5, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[0, 0, 8]} scale={[12, 6, 1]} />
        <Lightformer form="ring" color={ACCENT} intensity={1.2} position={[0, -3, 6]} scale={4} />
      </group>
    </Environment>
  );
}

/** Lights of one scene, plus the shared environment. */
export function StudioLights() {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    scene.environment = getEnvironment();
  }, [scene]);
  return (
    <>
      <ambientLight intensity={LIGHTS.ambient} />
      <directionalLight position={[...LIGHTS.key.position]} intensity={LIGHTS.key.intensity} color={LIGHTS.key.color} />
      <directionalLight position={[...LIGHTS.fill.position]} intensity={LIGHTS.fill.intensity} color={LIGHTS.fill.color} />
    </>
  );
}
