import { useEffect, useState } from 'react';

type Props = {
  /** 0..1 */
  progress: number;
  label: string;
  /** Fades the screen out, then removes it. */
  done: boolean;
  /** Replaces the progress bar with this message and a retry button. */
  error?: string;
};

/**
 * Full-screen loading screen shown from the very first paint until the game is ready.
 * Its styles and its initial markup live in index.html, so it appears before any script runs
 * and React takes it over without a flicker.
 */
export function BootScreen({ progress, label, done, error }: Props) {
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setRemoved(true), 500);
    return () => clearTimeout(timer);
  }, [done]);

  if (removed) return null;

  return (
    <div className={done ? 'boot boot--done' : 'boot'} role="status" aria-live="polite" aria-busy={!done}>
      <img className="boot__logo" src="/logo.png" alt="" />
      <p className="boot__name">Pierre Papier Ciseaux</p>
      {error ? (
        <>
          <p className="boot__label">{error}</p>
          <button type="button" className="boot__retry" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </>
      ) : (
        <>
          <div className="boot__track">
            <div className="boot__bar" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="boot__label">{label}</p>
        </>
      )}
    </div>
  );
}
