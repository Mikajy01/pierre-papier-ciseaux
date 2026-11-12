import { Canvas } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import { Model, type ModelKind } from './models';
import { Studio } from './Studio';

export type ChoiceSceneProps = {
  kind: ModelKind;
  active?: boolean;
  className?: string;
};

/** A single floating model. */
export function ChoiceScene({ kind, active, className }: ChoiceSceneProps) {
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.2, 5], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <Studio />
        <Float speed={active ? 3 : 1.6} rotationIntensity={0.25} floatIntensity={0.6}>
          <Model kind={kind} active={active} />
        </Float>
        <ContactShadows position={[0, -1.35, 0]} opacity={0.55} scale={6} blur={2.4} far={3} resolution={256} />
      </Canvas>
    </div>
  );
}

/** Rock, paper and scissors side by side. */
export function HeroScene({ className }: { className?: string }) {
  const items: ModelKind[] = ['pierre', 'papier', 'ciseau'];
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.3, 7.2], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <Studio />
        {items.map((kind, i) => (
          <Float key={kind} speed={1.4 + i * 0.3} rotationIntensity={0.3} floatIntensity={0.8}>
            <group position={[(i - 1) * 2.4, 0, 0]}>
              <Model kind={kind} />
            </group>
          </Float>
        ))}
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={12} blur={2.6} far={3} resolution={512} />
      </Canvas>
    </div>
  );
}
