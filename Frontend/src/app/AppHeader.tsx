import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui';

export function AppHeader({ children, onHome }: { children?: ReactNode; onHome?: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 h-14 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          disabled={!onHome}
          className="flex items-center gap-2.5 rounded-md enabled:hover:opacity-80 disabled:cursor-default"
        >
          <Logo size={28} />
          <span className="hidden sm:inline text-sm font-semibold tracking-tight">Pierre Papier Ciseaux</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">{children}</div>
      </div>
    </header>
  );
}
