import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { View } from '@react-three/drei';
import { setEnvironment } from './lighting';
import { StudioEnvironment } from './Studio';
import { warmUp } from './warmup';

/** Never keep the visitor waiting on the warm-up: past this delay the game starts anyway. */
const WARMUP_TIMEOUT_MS = 20_000;

/** Waits for the environment, warms the GPU up, then reports that scenes can be shown. */
function Warmup({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const frames = useRef(0);
  const started = useRef(false);

  useFrame(() => {
    // The environment is rendered during the first frames; start once it is there.
    if (started.current || !scene.environment || ++frames.current < 3) return;
    started.current = true;
    setEnvironment(scene.environment);

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, WARMUP_TIMEOUT_MS));
    Promise.race([warmUp(gl), timeout])
      .catch((error) => console.warn('Préchauffage 3D incomplet :', error))
      .finally(onReady);
  });
  return null;
}

/**
 * The one and only WebGL canvas of the site.
 *
 * It covers the viewport, ignores the pointer and stays mounted for the whole session.
 * Scenes are declared anywhere in the page with <View>: each one is drawn here, inside the
 * rectangle of its own element. One canvas means one GPU context, so shaders, buffers and
 * textures are prepared once instead of once per model.
 */
export function Stage({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none' }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5], fov: 35 }}
    >
      <StudioEnvironment />
      <Warmup onReady={onReady} />
      <View.Port />
    </Canvas>
  );
}
