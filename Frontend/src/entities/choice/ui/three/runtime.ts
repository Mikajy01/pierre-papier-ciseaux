/**
 * Entry point of the 3D engine. It is loaded as a separate chunk at start-up
 * (see ../runtime.ts), so the page can show a loading screen before three.js arrives.
 */
export { BattleScene, type BattleSceneProps } from './battle/BattleScene';
export { ChoiceScene, HeroScene, type ChoiceSceneProps } from './ChoiceScene';
export { prepareAssets } from './preload';
export { Stage } from './Stage';
