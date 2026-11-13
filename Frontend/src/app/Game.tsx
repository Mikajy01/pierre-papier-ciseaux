import { useCallback, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import type { MatchController } from '@/entities/match';
import { useBotMatch } from '@/features/bot';
import { HomePage } from '@/features/home';
import { MatchView, ScoreBoard } from '@/features/match';
import { ConnectionBadge, MultiplayerModal, useMultiplayer } from '@/features/multiplayer';
import { Button, useToast } from '@/shared/ui';
import { AppHeader } from './AppHeader';

type Mode = 'home' | 'bot' | 'multiplayer';

/** The game itself: home, lobby and matches. Mounted once everything is loaded. */
export function Game() {
  const notify = useToast();
  const [botActive, setBotActive] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(false);

  const exitBot = useCallback(() => setBotActive(false), []);
  const bot = useBotMatch({ onExit: exitBot });
  const mp = useMultiplayer({ onNotice: notify });

  // The lobby has done its job once the match starts.
  useEffect(() => {
    if (mp.stage === 'playing') setLobbyOpen(false);
  }, [mp.stage]);

  const mode: Mode = mp.stage === 'playing' ? 'multiplayer' : botActive ? 'bot' : 'home';
  const match: MatchController | null = mode === 'bot' ? bot : mode === 'multiplayer' ? mp.match : null;

  const openLobby = () => {
    mp.connect();
    setLobbyOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans antialiased bg-grid">
      <AppHeader onHome={match ? match.leave : undefined}>
        {match ? (
          <>
            <ScoreBoard score={match.score} opponentLabel={match.opponentLabel} />
            <Button variant="ghost" className="h-9 px-3" onClick={match.leave}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Quitter</span>
            </Button>
          </>
        ) : (
          mp.connection !== 'idle' && <ConnectionBadge status={mp.connection} />
        )}
      </AppHeader>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        {match ? (
          <MatchView match={match} />
        ) : (
          <HomePage onPlayBot={() => setBotActive(true)} onPlayMultiplayer={openLobby} />
        )}
      </main>

      <MultiplayerModal mp={mp} open={lobbyOpen && mode === 'home'} onClose={() => setLobbyOpen(false)} />

      <footer className="py-6 text-center text-xs text-zinc-600">© {new Date().getFullYear()} MR.BUG</footer>
    </div>
  );
}
