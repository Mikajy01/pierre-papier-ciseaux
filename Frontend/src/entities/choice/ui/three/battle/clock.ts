import { createContext, useContext, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export interface BattleClock {
  /** Seconds since the battle started. */
  t: number;
  /** Camera shake amplitude requested by the running duel. */
  shake: number;
}

export const ClockContext = createContext<{ current: BattleClock } | null>(null);

/** Runs `callback` every frame with the current battle time. */
export function useBattleFrame(callback: (t: number, clock: BattleClock) => void) {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error('useBattleFrame must be used inside <BattleStage>');
  const ref = useRef(callback);
  ref.current = callback;
  useFrame(() => ref.current(clock.current.t, clock.current));
}
