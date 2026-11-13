import {
  getBladeGeometry,
  getCageGeometry,
  getFlashRingGeometry,
  getGravelGeometry,
  getHeapGeometry,
  getOrbGeometry,
  getPaperGeometry,
  getPaperTexture,
  getRingGeometry,
  getRockGeometry,
  getScrewGeometry,
  getShankGeometry,
  getSoftTexture,
  getUnitBox,
  getUnitPlane,
} from './geometry';
import { getCutLayers } from './battle/cuttingPlan';
import { getDustGeometry } from './battle/rubble';
import { getBreakableScissors } from './battle/scissorsParts';
import { getWrapSheet } from './battle/wrapSheet';

/**
 * Builds every procedural model up front, one step per frame so a progress bar can move.
 * Each getter caches its result: later calls from the scenes return instantly.
 */
const STEPS: { label: string; run: () => void }[] = [
  { label: 'Sculpture de la pierre', run: () => void getRockGeometry() },
  {
    label: 'Impression du papier',
    run: () => {
      getPaperGeometry();
      getPaperTexture();
      getSoftTexture();
    },
  },
  {
    label: 'Affûtage des ciseaux',
    run: () => {
      getBladeGeometry();
      getRingGeometry();
      getShankGeometry();
      getScrewGeometry();
      getBreakableScissors();
    },
  },
  {
    label: 'Répétition des combats',
    run: () => {
      getCutLayers();
      getWrapSheet();
      getHeapGeometry();
      getGravelGeometry();
      getDustGeometry();
      getOrbGeometry();
      getCageGeometry();
      getUnitPlane();
      getUnitBox();
      getFlashRingGeometry();
    },
  },
];

/** Lets the browser paint before carrying on. */
const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export async function prepareAssets(onStep: (done: number, total: number, label: string) => void) {
  for (const [i, step] of STEPS.entries()) {
    onStep(i, STEPS.length, step.label);
    await nextPaint();
    step.run();
  }
  onStep(STEPS.length, STEPS.length, 'Préparation des scènes');
}
