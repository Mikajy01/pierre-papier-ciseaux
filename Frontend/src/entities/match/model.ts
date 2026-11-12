import type { Choice, Outcome } from '@/entities/choice';

export type MatchPhase = 'choosing' | 'countdown' | 'result';

export interface Score {
  me: number;
  opponent: number;
  draws: number;
}

export const EMPTY_SCORE: Score = { me: 0, opponent: 0, draws: 0 };

export function addToScore(score: Score, outcome: Outcome): Score {
  if (outcome === 'win') return { ...score, me: score.me + 1 };
  if (outcome === 'lose') return { ...score, opponent: score.opponent + 1 };
  return { ...score, draws: score.draws + 1 };
}

/** What any game mode (bot, multiplayer…) must expose to drive the match UI. */
export interface MatchController {
  phase: MatchPhase;
  myChoice: Choice | null;
  opponentChoice: Choice | null;
  outcome: Outcome | null;
  countdown: number;
  score: Score;
  opponentLabel: string;
  opponentReady: boolean;
  choose: (choice: Choice) => void;
  playAgain: () => void;
  leave: () => void;
}
