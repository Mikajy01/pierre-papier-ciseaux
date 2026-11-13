/**
 * Gateway to the 3D engine.
 *
 * three.js and the scenes live in their own chunk. It is fetched once at start-up, behind
 * the loading screen, and every procedural model is built right away. After that the scenes
 * are available synchronously: nothing is loaded or rebuilt when a screen changes.
 */

type Engine = typeof import('./three/runtime');

export interface LoadProgress {
  /** 0..1 */
  progress: number;
  label: string;
}

/** Share of the progress bar given to downloading the engine; the rest goes to building models. */
const DOWNLOAD_SHARE = 0.45;
const BUILD_SHARE = 0.4;

let engine: Engine | null = null;
let loading: Promise<void> | null = null;

/** Downloads the engine and builds every model. Safe to call more than once. */
export function loadChoice3D(onProgress: (state: LoadProgress) => void): Promise<void> {
  loading ??= (async () => {
    onProgress({ progress: 0.04, label: 'Chargement du moteur 3D' });
    const loaded = await import('./three/runtime');
    await loaded.prepareAssets((done, total, label) =>
      onProgress({ progress: DOWNLOAD_SHARE + BUILD_SHARE * (done / total), label }),
    );
    engine = loaded;
  })();
  // A failed attempt must not be cached, so that retrying is possible.
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/** The loaded engine. Only valid once `loadChoice3D` has resolved. */
export function getChoice3D(): Engine {
  if (!engine) throw new Error('The 3D engine is used before loadChoice3D() has finished.');
  return engine;
}
