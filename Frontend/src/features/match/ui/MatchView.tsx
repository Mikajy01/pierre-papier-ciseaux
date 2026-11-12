import type { MatchController } from '@/entities/match';
import { ChoosePhase } from './ChoosePhase';
import { CountdownPhase } from './CountdownPhase';
import { ResultPhase } from './ResultPhase';

/** Renders the current phase of a match, whatever the game mode behind it. */
export function MatchView({ match }: { match: MatchController }) {
  switch (match.phase) {
    case 'choosing':
      return (
        <ChoosePhase
          myChoice={match.myChoice}
          opponentLabel={match.opponentLabel}
          opponentReady={match.opponentReady}
          onChoose={match.choose}
        />
      );
    case 'countdown':
      return (
        <CountdownPhase countdown={match.countdown} myChoice={match.myChoice} opponentLabel={match.opponentLabel} />
      );
    case 'result':
      return match.outcome ? (
        <ResultPhase
          outcome={match.outcome}
          myChoice={match.myChoice}
          opponentChoice={match.opponentChoice}
          opponentLabel={match.opponentLabel}
          onPlayAgain={match.playAgain}
          onLeave={match.leave}
        />
      ) : null;
  }
}
