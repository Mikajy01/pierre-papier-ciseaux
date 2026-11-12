import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveOutcome, type Choice, type Outcome } from '@/entities/choice';
import { addToScore, EMPTY_SCORE, type MatchController, type MatchPhase, type Score } from '@/entities/match';
import { useCountdown } from '@/shared/lib/useCountdown';
import { pickBotChoice } from '../lib/strategy';

const THINKING_MS = 600;
const COUNTDOWN_S = 3;

export function useBotMatch({ onExit }: { onExit: () => void }): MatchController {
  const [phase, setPhase] = useState<MatchPhase>('choosing');
  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [botChoice, setBotChoice] = useState<Choice | null>(null);
  const [botReady, setBotReady] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [score, setScore] = useState<Score>(EMPTY_SCORE);
  const history = useRef<Choice[]>([]);
  const timers = useRef<number[]>([]);
  const countdown = useCountdown(phase === 'countdown', COUNTDOWN_S);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const resetRound = useCallback(() => {
    clearTimers();
    setPhase('choosing');
    setMyChoice(null);
    setBotChoice(null);
    setBotReady(false);
    setOutcome(null);
  }, []);

  const choose = useCallback(
    (choice: Choice) => {
      if (phase !== 'choosing' || myChoice) return;
      const bot = pickBotChoice(history.current);
      history.current.push(choice);
      setMyChoice(choice);

      timers.current.push(
        window.setTimeout(() => {
          setBotReady(true);
          setPhase('countdown');
        }, THINKING_MS),
        window.setTimeout(() => {
          const result = resolveOutcome(choice, bot);
          setBotChoice(bot);
          setOutcome(result);
          setScore((s) => addToScore(s, result));
          setPhase('result');
        }, THINKING_MS + COUNTDOWN_S * 1000),
      );
    },
    [phase, myChoice],
  );

  const leave = useCallback(() => {
    resetRound();
    setScore(EMPTY_SCORE);
    history.current = [];
    onExit();
  }, [resetRound, onExit]);

  return {
    phase,
    myChoice,
    opponentChoice: botChoice,
    outcome,
    countdown,
    score,
    opponentLabel: 'Bot',
    opponentReady: botReady,
    choose,
    playAgain: resetRound,
    leave,
  };
}
