import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { isChoice, resolveOutcome, type Choice, type Outcome } from '@/entities/choice';
import { addToScore, EMPTY_SCORE, type MatchController, type MatchPhase, type Score } from '@/entities/match';
import { useCountdown } from '@/shared/lib/useCountdown';
import { createGameSocket } from '../api/socket';
import { ClientEvents as C, ServerEvents as S, type RevealPayload, type SessionPayload } from '../api/events';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';
/** idle: no game · waiting: room created/joined, opponent missing · playing: match running */
export type LobbyStage = 'idle' | 'waiting' | 'playing';

type Options = {
  onNotice: (message: string) => void;
  /** Called when the session ends from the server side (opponent left…). */
  onSessionEnd?: () => void;
};

export function useMultiplayer({ onNotice, onSessionEnd }: Options) {
  const socketRef = useRef<Socket | null>(null);
  const callbacks = useRef({ onNotice, onSessionEnd });
  callbacks.current = { onNotice, onSessionEnd };

  const [connection, setConnection] = useState<ConnectionStatus>('idle');
  const [playerId, setPlayerId] = useState('');
  const [stage, setStage] = useState<LobbyStage>('idle');
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [phase, setPhase] = useState<MatchPhase>('choosing');
  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [score, setScore] = useState<Score>(EMPTY_SCORE);
  const countdown = useCountdown(phase === 'countdown');
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const resetRound = useCallback(() => {
    setPhase('choosing');
    setMyChoice(null);
    setOpponentChoice(null);
    setOpponentReady(false);
    setOutcome(null);
  }, []);

  const resetSession = useCallback(() => {
    resetRound();
    setSession(null);
    setStage('idle');
    setScore(EMPTY_SCORE);
  }, [resetRound]);

  /** Opens the socket connection (idempotent). */
  const connect = useCallback(() => {
    if (socketRef.current) return;
    const socket = createGameSocket();
    socketRef.current = socket;
    setConnection('connecting');

    socket.on('connect', () => {
      setPlayerId(socket.id ?? '');
      setConnection('connected');
    });
    socket.on('disconnect', () => {
      setConnection('disconnected');
      if (stageRef.current !== 'idle') callbacks.current.onNotice('Connexion au serveur perdue.');
    });
    socket.on('connect_error', () => setConnection('disconnected'));

    const onSession = (data: SessionPayload) => {
      setSession(data);
      setStage('waiting');
    };
    socket.on(S.GAME_CREATED, onSession);
    socket.on(S.GAME_JOINED, onSession);

    socket.on(S.START_GAME, () => {
      resetRound();
      setScore(EMPTY_SCORE);
      setStage('playing');
    });
    socket.on(S.OPPONENT_CHOICE_MADE, () => setOpponentReady(true));
    socket.on(S.START_COUNTDOWN, () => setPhase('countdown'));

    socket.on(S.REVEAL_CHOICES, (data: RevealPayload) => {
      const me = socket.id ?? '';
      const mine = data.choices[me];
      const theirs = Object.entries(data.choices).find(([id]) => id !== me)?.[1];
      if (!isChoice(mine) || !isChoice(theirs)) return;

      const result = resolveOutcome(mine, theirs);
      setMyChoice(mine);
      setOpponentChoice(theirs);
      setOutcome(result);
      setScore((s) => addToScore(s, result));
      setPhase('result');
    });

    socket.on(S.NEW_ROUND, resetRound);

    socket.on(S.INVALID_OTP, () => callbacks.current.onNotice('Code invalide. Vérifiez les 4 chiffres.'));
    socket.on(S.ROOM_FULL, () => callbacks.current.onNotice('Cette partie est déjà complète.'));
    socket.on(S.OPPONENT_DISCONNECTED, () => {
      callbacks.current.onNotice("Votre adversaire s'est déconnecté.");
      resetSession();
      callbacks.current.onSessionEnd?.();
    });
    socket.on(S.SERVER_SHUTDOWN, ({ message }: { message: string }) => callbacks.current.onNotice(message));
  }, [resetRound, resetSession]);

  useEffect(
    () => () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    },
    [],
  );

  const emit = useCallback(
    (event: string, payload?: object) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        callbacks.current.onNotice('Non connecté au serveur.');
        return false;
      }
      socket.emit(event, payload);
      return true;
    },
    [],
  );

  const createGame = useCallback(() => emit(C.CREATE_GAME), [emit]);
  const joinGame = useCallback((otp: string) => emit(C.JOIN_GAME, { otp }), [emit]);

  const leave = useCallback(() => {
    if (session) emit(C.LEAVE_GAME, { roomId: session.roomId });
    resetSession();
  }, [emit, session, resetSession]);

  const match: MatchController = {
    phase,
    myChoice,
    opponentChoice,
    outcome,
    countdown,
    score,
    opponentLabel: 'Adversaire',
    opponentReady,
    choose: (choice) => {
      if (!session || phase !== 'choosing') return;
      if (emit(C.MAKE_CHOICE, { roomId: session.roomId, choice })) setMyChoice(choice);
    },
    playAgain: () => {
      if (!session) return;
      if (emit(C.PLAY_AGAIN, { roomId: session.roomId })) resetRound();
    },
    leave,
  };

  return { connection, playerId, stage, session, match, connect, createGame, joinGame, leave };
}

export type MultiplayerApi = ReturnType<typeof useMultiplayer>;
