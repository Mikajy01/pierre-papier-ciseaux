import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ArrowRight, Check, Copy, Loader2, LogOut, Menu, Plus, RotateCcw, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const ChoiceScene = lazy(() => import('./Choice3D').then((m) => ({ default: m.ChoiceScene })));
const HeroScene = lazy(() => import('./Choice3D').then((m) => ({ default: m.HeroScene })));

type GameState = 'menu' | 'waiting' | 'playing' | 'countdown' | 'result';
type Choice = 'pierre' | 'papier' | 'ciseau' | null;
type Outcome = 'win' | 'lose' | 'draw' | null;

const OPTIONS: { key: Exclude<Choice, null>; name: string; hint: string }[] = [
  { key: 'pierre', name: 'Pierre', hint: 'Bat les ciseaux' },
  { key: 'papier', name: 'Papier', hint: 'Bat la pierre' },
  { key: 'ciseau', name: 'Ciseaux', hint: 'Bat le papier' },
];

const choiceLabel = (c: Choice) => OPTIONS.find((o) => o.key === c)?.name ?? '—';

const OUTCOME_STYLE: Record<Exclude<Outcome, null>, { title: string; sub: string; color: string }> = {
  win: { title: 'Victoire', sub: 'Bien joué, vous remportez la manche.', color: 'text-emerald-400' },
  lose: { title: 'Défaite', sub: "L'adversaire remporte cette manche.", color: 'text-rose-400' },
  draw: { title: 'Égalité', sub: 'Même choix des deux côtés.', color: 'text-zinc-200' },
};

function SceneFallback({ className }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
    </div>
  );
}

export default function Game() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [otp, setOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [choice, setChoice] = useState<Choice>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [countdown, setCountdown] = useState(3);
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered, setHovered] = useState<Choice>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const winSound = useRef<HTMLAudioElement>(null);
  const loseSound = useRef<HTMLAudioElement>(null);
  const drawSound = useRef<HTMLAudioElement>(null);

  const notify = (message: string) => setNotice(message);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    winSound.current = new Audio('/sounds/win.mp3');
    loseSound.current = new Audio('/sounds/lose.mp3');
    drawSound.current = new Audio('/sounds/draw.mp3');
    winSound.current.load();
    loseSound.current.load();
    drawSound.current.load();
  }, []);

  const playSound = (result: 'win' | 'lose' | 'draw') => {
    const soundMap = { win: winSound.current, lose: loseSound.current, draw: drawSound.current };
    soundMap[result]?.play().catch((err) => console.error('Erreur lecture son :', err));
  };

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    socketRef.current = io(serverUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setPlayerId(socket.id || '');
      setIsConnected(true);
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    socket.on('gameCreated', (data: { otp: string; roomId: string }) => {
      setOtp(data.otp);
      setRoomId(data.roomId);
      setGameState('waiting');
    });

    socket.on('gameJoined', (data: { roomId: string; otp: string }) => {
      setRoomId(data.roomId);
      setOtp(data.otp);
      setGameState('waiting');
    });

    socket.on('startGame', () => {
      setGameState('playing');
      setSidebarOpen(false);
    });

    socket.on('startCountdown', () => {
      setGameState('countdown');
      setCountdown(3);
    });

    socket.on('revealChoices', (data: {
      choices: Record<string, string>;
      result: string;
      winnerId: string | null;
    }) => {
      const idPlayer = socket.id || '';
      const opponent = Object.keys(data.choices).find((id) => id !== idPlayer);
      if (opponent) setOpponentChoice(data.choices[opponent] as Choice);
      setChoice(data.choices[idPlayer] as Choice);

      if (!data.winnerId) {
        playSound('draw');
        setOutcome('draw');
      } else if (data.winnerId === idPlayer) {
        playSound('win');
        setOutcome('win');
      } else {
        playSound('lose');
        setOutcome('lose');
      }
      setGameState('result');
    });

    socket.on('invalidOTP', () => {
      notify('Code invalide. Vérifiez les 4 chiffres.');
      setInputOtp('');
    });

    socket.on('roomFull', () => {
      notify('Cette partie est déjà complète.');
      setInputOtp('');
    });

    socket.on('opponentDisconnected', () => {
      notify("Votre adversaire s'est déconnecté.");
      setGameState('menu');
      resetGameState();
    });

    socket.on('newRound', () => {
      setChoice(null);
      setOpponentChoice(null);
      setOutcome(null);
      setGameState('playing');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const resetGameState = () => {
    setOtp('');
    setInputOtp('');
    setRoomId('');
    setChoice(null);
    setOpponentChoice(null);
    setOutcome(null);
    setCountdown(3);
  };

  const createGame = () => {
    if (socketRef.current && isConnected) socketRef.current.emit('createGame');
    else notify('Non connecté au serveur.');
  };

  const joinGame = () => {
    if (!isConnected) return notify('Non connecté au serveur.');
    if (inputOtp && socketRef.current) socketRef.current.emit('joinGame', { otp: inputOtp });
  };

  const makeChoice = (selectedChoice: Choice) => {
    if (socketRef.current && roomId && isConnected) {
      setChoice(selectedChoice);
      socketRef.current.emit('makeChoice', { roomId, choice: selectedChoice });
    } else {
      notify('Erreur de connexion.');
    }
  };

  const playAgain = () => {
    if (socketRef.current && roomId && isConnected) {
      setChoice(null);
      setOpponentChoice(null);
      setOutcome(null);
      socketRef.current.emit('playAgain', { roomId });
      setGameState('playing');
    }
  };

  const backToMenu = () => {
    if (socketRef.current && roomId && isConnected) {
      socketRef.current.emit('leaveGame', { roomId });
    }
    setGameState('menu');
    resetGameState();
    setSidebarOpen(false);
  };

  const copyOtp = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Keyboard shortcuts 1 / 2 / 3 while choosing
  const makeChoiceRef = useRef(makeChoice);
  makeChoiceRef.current = makeChoice;
  useEffect(() => {
    if (gameState !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const opt = OPTIONS[Number(e.key) - 1];
      if (opt) makeChoiceRef.current(opt.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, gameState]);

  const inGame = gameState !== 'menu';

  const primaryBtn =
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-zinc-50 text-zinc-950 text-sm font-medium transition-colors hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed';
  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 text-sm font-medium transition-colors hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed';
  const panel = 'rounded-2xl border border-zinc-800/80 bg-zinc-900/40';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans antialiased bg-grid">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-zinc-950 border-r border-zinc-800/80 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="w-8 h-8 rounded-md object-cover" />
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight">Pierre Papier Ciseaux</p>
                <p className="text-xs text-zinc-500">Multijoueur en temps réel</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Connection status */}
          <div className="flex items-center justify-between mb-8 px-3 h-10 rounded-lg border border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                {isConnected && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
                <span className={`relative w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </span>
              <span className={isConnected ? 'text-zinc-200' : 'text-zinc-500'}>
                {isConnected ? 'Connecté' : 'Connexion…'}
              </span>
            </div>
            {isConnected && <span className="font-mono text-zinc-500">{playerId.slice(0, 6)}</span>}
          </div>

          {/* Actions */}
          <section className="space-y-3 mb-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Nouvelle partie</p>
            <button onClick={createGame} disabled={inGame || !isConnected} className={`${primaryBtn} w-full`}>
              <Plus className="w-4 h-4" />
              Créer une partie
            </button>
          </section>

          <section className="space-y-3 mb-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Rejoindre avec un code</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && inputOtp.length === 4 && joinGame()}
                placeholder="0000"
                maxLength={4}
                disabled={inGame}
                className="flex-1 min-w-0 h-11 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center font-mono text-lg tracking-[0.5em] text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-500 disabled:opacity-40"
              />
              <button
                onClick={joinGame}
                disabled={inputOtp.length !== 4 || !isConnected || inGame}
                className={`${secondaryBtn} w-11 px-0`}
                aria-label="Rejoindre"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {inGame && otp && (
            <section className={`${panel} p-4 mb-4`}>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 mb-3">Partie en cours</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl tracking-[0.3em]">{otp}</span>
                <button
                  onClick={copyOtp}
                  className="p-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  aria-label="Copier le code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </section>
          )}

          {inGame && (
            <button onClick={backToMenu} className={`${secondaryBtn} w-full`}>
              <LogOut className="w-4 h-4" />
              Quitter la partie
            </button>
          )}

          <div className="mt-auto pt-6 text-xs text-zinc-600">
            © {new Date().getFullYear()} MR.BUG
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-6 h-6 rounded object-cover" />
            <span className="text-sm font-semibold tracking-tight">Pierre Papier Ciseaux</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-zinc-300 hover:bg-zinc-900"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          {gameState === 'menu' && (
            <div className="w-full max-w-4xl text-center">
              <Suspense fallback={<SceneFallback className="h-64 sm:h-80" />}>
                <HeroScene className="h-64 sm:h-80 w-full" />
              </Suspense>
              <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight">
                Pierre. Papier. <span className="text-accent">Ciseaux.</span>
              </h1>
              <p className="mt-4 text-zinc-400 text-base sm:text-lg max-w-xl mx-auto">
                {isConnected
                  ? 'Créez une partie et partagez le code, ou rejoignez celle d’un ami. Une manche, trois secondes, un gagnant.'
                  : 'Connexion au serveur en cours…'}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 lg:hidden">
                <button onClick={() => setSidebarOpen(true)} className={primaryBtn}>
                  Commencer
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-12 hidden sm:grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-800/80 text-left">
                {[
                  ['01', 'Créez', 'Générez un code de partie à 4 chiffres.'],
                  ['02', 'Partagez', 'Envoyez-le à votre adversaire.'],
                  ['03', 'Jouez', 'Choisissez en secret, révélation simultanée.'],
                ].map(([n, t, d]) => (
                  <div key={n} className="bg-zinc-950 p-5">
                    <p className="font-mono text-xs text-zinc-600">{n}</p>
                    <p className="mt-2 text-sm font-medium">{t}</p>
                    <p className="mt-1 text-sm text-zinc-500">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState === 'waiting' && (
            <div className={`${panel} w-full max-w-lg p-8 sm:p-12 text-center`}>
              <div className="inline-flex items-center gap-2 text-xs text-zinc-400 border border-zinc-800 rounded-full px-3 h-7">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                En attente d'un adversaire
              </div>
              <h2 className="mt-6 text-2xl sm:text-3xl font-semibold tracking-tight">Partagez ce code</h2>
              <p className="mt-2 text-zinc-500 text-sm">La partie démarre dès que votre ami le saisit.</p>
              <div className="mt-8 flex justify-center gap-2 sm:gap-3">
                {otp.split('').map((d, i) => (
                  <div
                    key={i}
                    className="w-14 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-3xl sm:text-4xl"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <button onClick={copyOtp} className={`${secondaryBtn} mt-8`}>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié' : 'Copier le code'}
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="w-full max-w-5xl">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Manche en cours</p>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Faites votre choix</h2>
                </div>
                <p className="hidden sm:block text-xs text-zinc-500">
                  Raccourcis <kbd className="kbd">1</kbd> <kbd className="kbd">2</kbd> <kbd className="kbd">3</kbd>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {OPTIONS.map((option, i) => {
                  const selected = choice === option.key;
                  const dimmed = choice !== null && !selected;
                  return (
                    <button
                      key={option.key}
                      onClick={() => makeChoice(option.key)}
                      onMouseEnter={() => setHovered(option.key)}
                      onMouseLeave={() => setHovered(null)}
                      className={`group relative text-left rounded-2xl border transition-all duration-300 overflow-hidden ${selected
                        ? 'border-accent bg-zinc-900 ring-1 ring-accent'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                        } ${dimmed ? 'opacity-50 hover:opacity-80' : ''}`}
                    >
                      <span className="absolute top-4 left-4 font-mono text-xs text-zinc-600">0{i + 1}</span>
                      {selected && (
                        <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                          <Check className="w-3.5 h-3.5" /> Choisi
                        </span>
                      )}
                      <Suspense fallback={<SceneFallback className="h-52 md:h-60" />}>
                        <ChoiceScene
                          kind={option.key}
                          active={hovered === option.key || selected}
                          className="h-52 md:h-60 w-full pointer-events-none"
                        />
                      </Suspense>
                      <div className="px-5 pb-5 flex items-end justify-between">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight">{option.name}</h3>
                          <p className="text-sm text-zinc-500">{option.hint}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 h-6 flex items-center justify-center text-sm text-zinc-400">
                {choice && (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Vous avez choisi {choiceLabel(choice)}. En attente de l'adversaire…
                  </span>
                )}
              </div>
            </div>
          )}

          {gameState === 'countdown' && (
            <div className="w-full max-w-3xl text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Révélation dans</p>
              <div key={countdown} className="mt-2 font-mono text-8xl sm:text-9xl font-medium text-accent animate-countdown">
                {countdown}
              </div>
              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className={`${panel} overflow-hidden`}>
                  <Suspense fallback={<SceneFallback className="h-44 sm:h-56" />}>
                    <ChoiceScene kind={choice ?? 'unknown'} className="h-44 sm:h-56 w-full" />
                  </Suspense>
                  <p className="pb-4 text-sm text-zinc-400">Vous</p>
                </div>
                <span className="font-mono text-sm text-zinc-600">VS</span>
                <div className={`${panel} overflow-hidden`}>
                  <Suspense fallback={<SceneFallback className="h-44 sm:h-56" />}>
                    <ChoiceScene kind="unknown" className="h-44 sm:h-56 w-full" />
                  </Suspense>
                  <p className="pb-4 text-sm text-zinc-400">Adversaire</p>
                </div>
              </div>
            </div>
          )}

          {gameState === 'result' && outcome && (
            <div className="w-full max-w-4xl">
              <div className="text-center mb-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Résultat</p>
                <h2 className={`mt-2 text-5xl sm:text-6xl font-semibold tracking-tight ${OUTCOME_STYLE[outcome].color}`}>
                  {OUTCOME_STYLE[outcome].title}
                </h2>
                <p className="mt-3 text-zinc-400">{OUTCOME_STYLE[outcome].sub}</p>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 mb-10">
                {[
                  { who: 'Vous', c: choice, winner: outcome === 'win' },
                  null,
                  { who: 'Adversaire', c: opponentChoice, winner: outcome === 'lose' },
                ].map((side, i) =>
                  side === null ? (
                    <span key={i} className="font-mono text-sm text-zinc-600">VS</span>
                  ) : (
                    <div
                      key={i}
                      className={`rounded-2xl border overflow-hidden transition-colors ${side.winner ? 'border-accent bg-zinc-900' : 'border-zinc-800/80 bg-zinc-900/40'}`}
                    >
                      <Suspense fallback={<SceneFallback className="h-48 sm:h-64" />}>
                        <ChoiceScene kind={side.c ?? 'unknown'} active={side.winner} className="h-48 sm:h-64 w-full" />
                      </Suspense>
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-zinc-500">{side.who}</p>
                          <p className="text-base sm:text-lg font-semibold tracking-tight">{choiceLabel(side.c)}</p>
                        </div>
                        {side.winner && (
                          <span className="hidden sm:inline-flex text-[11px] font-medium text-accent border border-accent/40 rounded-full px-2 h-6 items-center">
                            Gagnant
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button onClick={playAgain} className={primaryBtn}>
                  <RotateCcw className="w-4 h-4" />
                  Rejouer
                </button>
                <button onClick={backToMenu} className={secondaryBtn}>
                  Retour au menu
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${notice ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
        role="status"
      >
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 h-11 text-sm text-zinc-200 shadow-xl shadow-black/40">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          {notice}
        </div>
      </div>
    </div>
  );
}
