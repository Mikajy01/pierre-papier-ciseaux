import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { HomePage } from '@/features/home';
import { MatchView } from '@/features/match';
import { LobbySidebar, useMultiplayer, WaitingRoom } from '@/features/multiplayer';
import { Panel, useToast } from '@/shared/ui';
import { preloadSounds } from '@/shared/lib/sound';

export function App() {
  const notify = useToast();
  const mp = useMultiplayer({ onNotice: notify });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { connect } = mp;

  useEffect(() => {
    preloadSounds();
    connect();
  }, [connect]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans antialiased bg-grid">
      <LobbySidebar mp={mp} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-end h-14 px-4 border-b border-zinc-800/80">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-zinc-900" aria-label="Menu">
            <Menu className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          {mp.stage === 'idle' && <HomePage />}
          {mp.stage === 'waiting' && mp.session && (
            <Panel className="w-full max-w-lg p-8 sm:p-12">
              <WaitingRoom otp={mp.session.otp} />
            </Panel>
          )}
          {mp.stage === 'playing' && <MatchView match={mp.match} />}
        </main>
      </div>
    </div>
  );
}
