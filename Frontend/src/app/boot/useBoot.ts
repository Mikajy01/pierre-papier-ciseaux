import { useCallback, useEffect, useState } from 'react';
import { loadChoice3D } from '@/entities/choice';
import { preloadSounds } from '@/shared/lib/sound';

/**
 * loading  the 3D engine is being downloaded and the models built
 * warming  the stage is mounted and the GPU is being prepared
 * ready    everything is in memory: the game can be shown
 */
export type BootPhase = 'loading' | 'warming' | 'ready' | 'error';

interface BootState {
  phase: BootPhase;
  /** 0..1 */
  progress: number;
  label: string;
  /** What to tell the visitor when the phase is `error`. */
  error?: string;
}

/**
 * The loading screen stays up at least this long after the page started loading. On a fast
 * machine everything is ready in a blink, and a screen that flashes by looks like a glitch.
 */
const MIN_SPLASH_MS = 900;

/** While a step reports nothing (a download, a compile), the bar creeps towards this ceiling. */
const CREEP_CEILING: Partial<Record<BootPhase, number>> = { loading: 0.42, warming: 0.97 };

/** Loads everything the game needs, once, and reports progress for the loading screen. */
export function useBoot() {
  const [state, setState] = useState<BootState>({ phase: 'loading', progress: 0.04, label: 'Chargement du moteur 3D' });

  useEffect(() => {
    loadChoice3D(({ progress, label }) =>
      setState((s) => (s.phase === 'loading' ? { ...s, label, progress: Math.max(s.progress, progress) } : s)),
    )
      .then(() => setState((s) => (s.phase === 'loading' ? { ...s, phase: 'warming', label: 'Préparation des scènes' } : s)))
      .catch((error) => {
        console.error('Chargement de la 3D impossible :', error);
        setState((s) => ({ ...s, phase: 'error', error: 'Le téléchargement a échoué. Vérifiez votre connexion.' }));
      });
  }, []);

  // Keep the bar alive during the long silent steps.
  const ceiling = CREEP_CEILING[state.phase];
  useEffect(() => {
    if (ceiling === undefined) return;
    const id = setInterval(
      () => setState((s) => (s.progress < ceiling ? { ...s, progress: s.progress + (ceiling - s.progress) * 0.06 } : s)),
      120,
    );
    return () => clearInterval(id);
  }, [ceiling]);

  const ready = useCallback(() => {
    // Sounds are only needed at the end of the first round: fetch them now, once the
    // engine no longer competes for the connection.
    preloadSounds();
    const reveal = () => setState({ phase: 'ready', progress: 1, label: 'Prêt' });
    const remaining = MIN_SPLASH_MS - performance.now(); // performance.now() counts from navigation start
    if (remaining <= 0) return reveal();
    setState((s) => ({ ...s, progress: 1, label: 'Prêt' }));
    setTimeout(reveal, remaining);
  }, []);
  /** The 3D stage could not start: WebGL is missing or blocked. */
  const fail = useCallback(
    () => setState((s) => ({ ...s, phase: 'error', error: "Votre navigateur n'a pas pu démarrer l'affichage 3D." })),
    [],
  );

  return { ...state, ready, fail };
}
