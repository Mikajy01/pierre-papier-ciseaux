import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { ClockContext, type BattleClock } from './clock';
import { FX_LAYER } from './stage';

type Props = {
  duration: number;
  /** Freezes the battle at a given time (previews and tests). */
  frozenAt?: number;
  onDone?: () => void;
  children: ReactNode;
};

/** Owns the battle clock, frames the camera and reports when the fight is over. */
export function BattleStage({ duration, frozenAt, onDone, children }: Props) {
  const clock = useRef<BattleClock>({ t: frozenAt ?? 0, shake: 0 });
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const camera = useThree((s) => s.camera);

  useLayoutEffect(() => {
    camera.layers.enable(FX_LAYER);
  }, [camera]);

  useFrame((state, delta) => {
    const c = clock.current;
    // Clamp so a tab coming back from the background does not skip the whole fight.
    c.t = frozenAt ?? c.t + Math.min(delta, 1 / 10);
    if (!done.current && frozenAt === undefined && c.t >= duration) {
      done.current = true;
      onDoneRef.current?.();
    }
    // Keep the whole arena in frame on narrow canvases.
    const aspect = (state.camera as PerspectiveCamera).aspect;
    const distance = Math.max(7.4, 12.6 / aspect);
    const s = c.shake;
    state.camera.position.set(Math.sin(c.t * 97) * s, 2.5 + Math.cos(c.t * 83) * s, distance);
    state.camera.lookAt(0, 0.25, 0);
  }, -1);

  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}
