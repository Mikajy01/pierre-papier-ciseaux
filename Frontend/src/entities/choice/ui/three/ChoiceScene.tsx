import { Float, PerspectiveCamera, View } from '@react-three/drei';
import { Model, type ModelKind } from './models';
import { BlobShadow } from './shadows';
import { StudioLights } from './Studio';

export type ChoiceSceneProps = {
  kind: ModelKind;
  active?: boolean;
  className?: string;
};

/**
 * A single floating model.
 * Renders a plain element in the page; the 3D content is drawn at its place by the stage.
 */
export function ChoiceScene({ kind, active, className }: ChoiceSceneProps) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0.2, 5]} fov={35} />
      <StudioLights />
      <Float speed={active ? 3 : 1.6} rotationIntensity={0.25} floatIntensity={0.6}>
        <Model kind={kind} active={active} />
      </Float>
      <BlobShadow size={2.6} />
    </View>
  );
}

const HERO: ModelKind[] = ['pierre', 'papier', 'ciseau'];

/** Rock, paper and scissors side by side. */
export function HeroScene({ className }: { className?: string }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0.3, 7.2]} fov={35} />
      <StudioLights />
      {HERO.map((kind, i) => (
        <group key={kind} position={[(i - 1) * 2.4, 0, 0]}>
          <Float speed={1.4 + i * 0.3} rotationIntensity={0.3} floatIntensity={0.8}>
            <Model kind={kind} />
          </Float>
          <BlobShadow size={2.4} />
        </group>
      ))}
    </View>
  );
}
