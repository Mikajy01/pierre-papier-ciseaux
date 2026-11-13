import type { Object3D } from 'three';

export { GROUND_Y } from '../geometry';
export const GRAVITY = 9.8;
/** The winner waits at -HOME_X, the fight happens around +FIGHT_X. */
export const HOME_X = 2.1;
export const FIGHT_X = 1.4;

/** Effects live on their own layer so they do not cast contact shadows. */
export const FX_LAYER = 1;
export const onFxLayer = (object: Object3D | null) => {
  object?.layers.set(FX_LAYER);
};
