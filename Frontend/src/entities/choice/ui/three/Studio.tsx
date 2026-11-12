import { Environment, Lightformer } from '@react-three/drei';
import { ACCENT } from './geometry';

/** Shared studio lighting: key/fill lights and a procedural environment for reflections. */
export function Studio() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#ffd9c7" />
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="rect" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[10, 1, 1]} />
          <Lightformer form="rect" intensity={3} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1.5, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[0, 0, 8]} scale={[12, 6, 1]} />
          <Lightformer form="ring" color={ACCENT} intensity={1.2} position={[0, -3, 6]} scale={4} />
        </group>
      </Environment>
    </>
  );
}
