import { getChoice3D } from './runtime';
import type { BattleSceneProps, ChoiceSceneProps } from './three/runtime';

/**
 * 3D components of a choice. They need the engine to be loaded (see `loadChoice3D`) and
 * <ChoiceStage /> to be mounted once at the root of the app.
 */

/** The single canvas every 3D scene is drawn on. Mount it once, for the whole session. */
export function ChoiceStage(props: { onReady: () => void }) {
  const { Stage } = getChoice3D();
  return <Stage {...props} />;
}

/** A single floating 3D model of a choice. */
export function ChoiceModel(props: ChoiceSceneProps) {
  const { ChoiceScene } = getChoice3D();
  return <ChoiceScene {...props} />;
}

/** Rock, paper and scissors side by side. */
export function ChoiceHero(props: { className?: string }) {
  const { HeroScene } = getChoice3D();
  return <HeroScene {...props} />;
}

/** Animated fight between two choices: `mine` on the left, `theirs` on the right. */
export function ChoiceBattle(props: BattleSceneProps) {
  const { BattleScene } = getChoice3D();
  return <BattleScene {...props} />;
}
