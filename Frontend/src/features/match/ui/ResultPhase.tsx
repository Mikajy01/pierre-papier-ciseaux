import { RotateCcw } from 'lucide-react';
import { ChoiceModel, choiceLabel, type Choice, type Outcome } from '@/entities/choice';
import { Button, Eyebrow } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

const OUTCOME_COPY: Record<Outcome, { title: string; sub: string; color: string }> = {
  win: { title: 'Victoire', sub: 'Bien joué, vous remportez la manche.', color: 'text-emerald-400' },
  lose: { title: 'Défaite', sub: 'Votre adversaire remporte cette manche.', color: 'text-rose-400' },
  draw: { title: 'Égalité', sub: 'Même choix des deux côtés.', color: 'text-zinc-200' },
};

type Props = {
  outcome: Outcome;
  myChoice: Choice | null;
  opponentChoice: Choice | null;
  opponentLabel: string;
  onPlayAgain: () => void;
  onLeave: () => void;
};

export function ResultPhase({ outcome, myChoice, opponentChoice, opponentLabel, onPlayAgain, onLeave }: Props) {
  const copy = OUTCOME_COPY[outcome];
  const sides = [
    { who: 'Vous', choice: myChoice, winner: outcome === 'win' },
    { who: opponentLabel, choice: opponentChoice, winner: outcome === 'lose' },
  ];

  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-8">
        <Eyebrow>Résultat</Eyebrow>
        <h2 className={cn('mt-2 text-5xl sm:text-6xl font-semibold tracking-tight', copy.color)}>{copy.title}</h2>
        <p className="mt-3 text-zinc-400">{copy.sub}</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 mb-10">
        {sides.map((side, i) => (
          <div key={side.who} className="contents">
            {i === 1 && <span className="font-mono text-sm text-zinc-600">VS</span>}
            <div
              className={cn(
                'rounded-2xl border overflow-hidden transition-colors',
                side.winner ? 'border-accent bg-zinc-900' : 'border-zinc-800/80 bg-zinc-900/40',
              )}
            >
              <ChoiceModel kind={side.choice ?? 'unknown'} active={side.winner} className="h-48 sm:h-64 w-full" />
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">{side.who}</p>
                  <p className="text-base sm:text-lg font-semibold tracking-tight">{choiceLabel(side.choice)}</p>
                </div>
                {side.winner && (
                  <span className="hidden sm:inline-flex text-[11px] font-medium text-accent border border-accent/40 rounded-full px-2 h-6 items-center">
                    Gagnant
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button onClick={onPlayAgain}>
          <RotateCcw className="w-4 h-4" />
          Rejouer
        </Button>
        <Button variant="secondary" onClick={onLeave}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
}
