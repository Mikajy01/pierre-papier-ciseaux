import { useState, useEffect, useRef } from 'react';
import { Users, Gamepad2, Trophy, Wifi, WifiOff, Copy, Check } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

type GameState = 'menu' | 'waiting' | 'playing' | 'countdown' | 'result';
type Choice = 'pierre' | 'papier' | 'ciseau' | null;

export default function Game() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [otp, setOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [choice, setChoice] = useState<Choice>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice>(null);
  const [result, setResult] = useState<string>('');
  const [countdown, setCountdown] = useState(3);
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const winSound = useRef<HTMLAudioElement>(null);
  const loseSound = useRef<HTMLAudioElement>(null);
  const drawSound = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    winSound.current = new Audio('/sounds/win.mp3');
    loseSound.current = new Audio('/sounds/lose.mp3');
    drawSound.current = new Audio('/sounds/draw.mp3');

    // Optionnel mais recommandé
    winSound.current.load();
    loseSound.current.load();
    drawSound.current.load();
  }, []);

  const playSound = (result: 'win' | 'lose' | 'draw') => {
    const soundMap = {
      win: winSound.current,
      lose: loseSound.current,
      draw: drawSound.current,
    };

    const audio = soundMap[result];
    audio?.play().catch((err) => {
      console.error('Erreur lecture son :', err);
    });
  };

  useEffect(() => {
    // Connect to Socket.io server
    const serverUrl = import.meta.env.VITE_SERVER_URL;

    socketRef.current = io(serverUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
      setPlayerId(socket.id || '');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Game events
    socket.on('gameCreated', (data: { otp: string; roomId: string }) => {
      console.log('Game created:', data);
      setOtp(data.otp);
      setRoomId(data.roomId);
      setGameState('waiting');
    });

    // FIX: Nouveau événement pour recevoir le roomId quand on rejoint
    socket.on('gameJoined', (data: { roomId: string; otp: string }) => {
      console.log('Game joined:', data);
      setRoomId(data.roomId);
      setOtp(data.otp);
      setGameState('waiting');
    });

    socket.on('gameReady', (data: { players: string[] }) => {
      console.log('Game ready:', data);
      const opponent = data.players.find(id => id !== playerId);
    });

    socket.on('startGame', () => {
      console.log('Game starting');
      setGameState('playing');
      setSidebarOpen(false);
    });

    socket.on('opponentChoiceMade', () => {
      console.log('Opponent made a choice');
      // Optionally show a visual indicator that opponent chose
    });

    socket.on('startCountdown', () => {
      console.log('Starting countdown');
      setGameState('countdown');
      setCountdown(3);
    });

    socket.on('revealChoices', (data: {
      choices: Record<string, string>;
      result: string;
      winnerId: string | null;
    }) => {
      console.log('Revealing choices:', data);
      const idPlayer = socket.id || '';
      const opponent = Object.keys(data.choices).find(id => id !== idPlayer);
      if (opponent) {
        setOpponentChoice(data.choices[opponent] as Choice);
      }
      setChoice(data.choices[idPlayer] as Choice);

      // Determine result message
      if (!data.winnerId) {
        playSound('draw');
        setResult('Match nul !');
      } else if (data.winnerId === idPlayer) {
        playSound('win');
        setResult('Victoire !');
      } else {
        playSound('lose');
        setResult('Défaite !');
      }
      setGameState('result');
    });

    socket.on('invalidOTP', () => {
      alert('Code OTP invalide');
      setInputOtp('');
    });

    socket.on('roomFull', () => {
      alert('La salle est déjà pleine');
      setInputOtp('');
    });

    socket.on('opponentDisconnected', () => {
      alert('Votre adversaire s\'est déconnecté');
      setGameState('menu');
      resetGameState();
    });

    socket.on('newRound', () => {
      console.log('New round starting');
      setChoice(null);
      setOpponentChoice(null);
      setResult('');
      setGameState('playing');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Ajout de playerId dans les dépendances

  const resetGameState = () => {
    setOtp('');
    setInputOtp('');
    setRoomId('');
    setChoice(null);
    setOpponentChoice(null);
    setResult('');
    setCountdown(3);
  };

  const createGame = () => {
    if (socketRef.current && isConnected) {
      console.log('Creating game...');
      socketRef.current.emit('createGame');
    } else {
      alert('Non connecté au serveur');
    }
  };

  const joinGame = () => {
    if (inputOtp && socketRef.current && isConnected) {
      console.log('Joining game with OTP:', inputOtp);
      socketRef.current.emit('joinGame', { otp: inputOtp });
    } else if (!isConnected) {
      alert('Non connecté au serveur');
    }
  };

  const makeChoice = (selectedChoice: Choice) => {
    if (socketRef.current && roomId && isConnected) {
      console.log('Making choice:', selectedChoice, 'in room:', roomId);
      setChoice(selectedChoice);
      socketRef.current.emit('makeChoice', { roomId, choice: selectedChoice });
    } else {
      console.log('socketRef.current: ', socketRef.current, ' roomId: ', roomId, ' isConnected: ', isConnected);
      alert('Erreur de connexion');
    }
  };

  const playAgain = () => {
    if (socketRef.current && roomId && isConnected) {
      console.log('Play again requested');
      setChoice(null);
      setOpponentChoice(null);
      setResult('');
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

  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, gameState]);

  const getChoiceEmoji = (choice: Choice) => {
    switch (choice) {
      case 'pierre': return '🗿';
      case 'papier': return '📄';
      case 'ciseau': return '✂️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white/10 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Gamepad2 className="w-8 h-8 text-white" />
              <h1 className="text-xl font-bold text-white">Pierre-Papier-Ciseaux</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2 mb-8 p-3 rounded-lg bg-white/5">
            {isConnected ? (
              <>
                <Wifi className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm">Connecté</span>
                <span className="text-white/60 text-xs">({playerId.slice(0, 8)}...)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">Déconnecté</span>
              </>
            )}
          </div>

          {/* Game Actions */}
          <div className="space-y-4 mb-8">
            <button
              onClick={createGame}
              disabled={gameState !== 'menu' || !isConnected}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Créer une partie</span>
              </div>
            </button>

            <div className="flex items-center">
              <div className="flex-grow border-t border-white/20"></div>
              <span className="mx-4 text-white/60 text-sm">OU</span>
              <div className="flex-grow border-t border-white/20"></div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value)}
                placeholder="Code à 4 chiffres"
                maxLength={4}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-white/50 text-center text-lg font-mono"
              />
              <button
                onClick={joinGame}
                disabled={!inputOtp || inputOtp.length !== 4 || !isConnected}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                Rejoindre
              </button>
            </div>
          </div>

          {/* Current Game Info */}
          {(gameState === 'waiting' || gameState === 'playing' || gameState === 'countdown' || gameState === 'result') && (
            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <h3 className="text-white font-medium mb-2">Partie en cours</h3>
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm">Code :</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono text-lg">{otp}</span>
                  <button
                    onClick={copyOtp}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {/* Debug info */}
              <div className="text-xs text-white/40 mt-2">
                Room: {roomId}
              </div>
            </div>
          )}

          {/* Back to Menu */}
          {gameState !== 'menu' && (
            <button
              onClick={backToMenu}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl font-medium transition-all duration-200 border border-white/20"
            >
              Retour au menu
            </button>
          )}
          <div className="mt-auto pt-4 text-center text-xs text-white/40">
            © {new Date().getFullYear()} MR.BUG - Tous droits réservés
          </div>
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 bg-white/10 backdrop-blur-xl text-white p-3 rounded-xl border border-white/20"
      >
        <Gamepad2 className="w-6 h-6" />
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        {gameState === 'menu' && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <div className="text-6xl mb-6">🎮</div>
              <h2 className="text-4xl font-bold text-white mb-4">
                {isConnected ? 'Prêt à jouer ?' : 'Connexion...'}
              </h2>
              <p className="text-white/80 text-lg mb-8">
                {isConnected
                  ? 'Utilisez le panneau de gauche pour créer ou rejoindre une partie'
                  : 'Connexion au serveur en cours...'
                }
              </p>
              {isConnected ? (
                <div className="flex justify-center space-x-4 text-4xl">
                  <span className="animate-bounce">🗿</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>📄</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>✂️</span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="animate-spin text-4xl">⏳</div>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <div className="animate-spin text-6xl mb-6">⏳</div>
              <h2 className="text-3xl font-bold text-white mb-4">En attente d'un adversaire</h2>
              <p className="text-white/80 text-lg mb-8">
                Partagez le code <span className="font-mono font-bold text-xl bg-white/20 px-3 py-1 rounded-lg">{otp}</span> avec votre ami
              </p>
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-white/60 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-3 h-3 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="w-full max-w-4xl">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h2 className="text-3xl font-bold text-white text-center mb-8">Faites votre choix</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'pierre', emoji: '🗿', name: 'Pierre' },
                  { key: 'papier', emoji: '📄', name: 'Papier' },
                  { key: 'ciseau', emoji: '✂️', name: 'Ciseaux' }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => makeChoice(option.key as Choice)}
                    className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${choice === option.key
                      ? 'border-yellow-400 bg-yellow-400/20 shadow-xl shadow-yellow-400/20'
                      : 'border-white/30 bg-white/5 hover:border-white/50 hover:bg-white/10'
                      }`}
                  >
                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      {option.emoji}
                    </div>
                    <h3 className="text-xl font-bold text-white">{option.name}</h3>
                  </button>
                ))}
              </div>

              {choice && (
                <div className="mt-8 text-center">
                  <div className="bg-white/10 rounded-xl p-4 inline-block">
                    <p className="text-white/80">Votre choix : <span className="text-xl">{getChoiceEmoji(choice)}</span></p>
                    <p className="text-white/60 text-sm mt-2">En attente de l'adversaire...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-8">Révélation dans...</h2>
              <div className="text-8xl font-bold text-yellow-400 animate-pulse mb-8">
                {countdown}
              </div>
              <div className="flex justify-center space-x-8">
                <div className="text-center">
                  <p className="text-white/80 mb-2">Vous</p>
                  <div className="text-4xl">{getChoiceEmoji(choice)}</div>
                </div>
                <div className="text-4xl text-white/60">VS</div>
                <div className="text-center">
                  <p className="text-white/80 mb-2">Adversaire</p>
                  <div className="text-4xl">❓</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'result' && (
          <div className="w-full max-w-4xl">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center mb-8">
                <div className={`text-4xl font-bold mb-4 ${result.includes('Victoire') ? 'text-green-400' :
                  result.includes('Défaite') ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                  {result.includes('Victoire') && '🎉'}
                  {result.includes('Défaite') && '😔'}
                  {result.includes('nul') && '🤝'}
                </div>
                <h2 className={`text-3xl font-bold ${result.includes('Victoire') ? 'text-green-400' :
                  result.includes('Défaite') ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                  {result}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8">
                <div className="text-center">
                  <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                    <p className="text-white font-medium mb-4">Vous</p>
                    <div className="text-6xl mb-2">{getChoiceEmoji(choice)}</div>
                    <p className="text-white/80 capitalize">{choice}</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-4xl text-white/60 font-bold">VS</div>
                </div>

                <div className="text-center">
                  <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                    <p className="text-white font-medium mb-4">Adversaire</p>
                    <div className="text-6xl mb-2">{getChoiceEmoji(opponentChoice)}</div>
                    <p className="text-white/80 capitalize">{opponentChoice}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={playAgain}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-8 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Trophy className="w-5 h-5" />
                    <span>Rejouer</span>
                  </div>
                </button>
                <button
                  onClick={backToMenu}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 px-8 rounded-xl font-medium transition-all duration-200 border border-white/20"
                >
                  Retour au menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}