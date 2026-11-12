import { useState } from 'react';
import { ArrowRight, LogOut, Plus, X } from 'lucide-react';
import { Button, Eyebrow, Logo } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { MultiplayerApi } from '../model/useMultiplayer';
import { ConnectionBadge } from './ConnectionBadge';

type Props = { mp: MultiplayerApi; open: boolean; onClose: () => void };

export function LobbySidebar({ mp, open, onClose }: Props) {
  const [code, setCode] = useState('');
  const inGame = mp.stage !== 'idle';
  const online = mp.connection === 'connected';

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-80 bg-zinc-950 border-r border-zinc-800/80 transform transition-transform duration-300 lg:translate-x-0 lg:static',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex flex-col h-full p-6">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Logo />
            <p className="text-sm font-semibold tracking-tight">Pierre Papier Ciseaux</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:bg-zinc-900" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ConnectionBadge status={mp.connection} className="mb-8" />

        <section className="space-y-3 mb-8">
          <Eyebrow>Nouvelle partie</Eyebrow>
          <Button onClick={mp.createGame} disabled={inGame || !online} className="w-full">
            <Plus className="w-4 h-4" />
            Créer une partie
          </Button>
        </section>

        <section className="space-y-3 mb-8">
          <Eyebrow>Rejoindre avec un code</Eyebrow>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              disabled={inGame}
              className="flex-1 min-w-0 h-11 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center font-mono text-lg tracking-[0.5em] placeholder-zinc-700 focus:outline-none focus:border-zinc-500 disabled:opacity-40"
            />
            <Button
              variant="secondary"
              className="w-11 px-0"
              disabled={code.length !== 4 || !online || inGame}
              onClick={() => mp.joinGame(code)}
              aria-label="Rejoindre"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {inGame && (
          <Button variant="secondary" onClick={mp.leave} className="w-full">
            <LogOut className="w-4 h-4" />
            Quitter la partie
          </Button>
        )}
      </div>
    </aside>
  );
}
