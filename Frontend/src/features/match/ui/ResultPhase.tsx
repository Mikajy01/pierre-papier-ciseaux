import { useCallback, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ChoiceBattle, choiceLabel, type Choice, type Outcome } from '@/entities/choice';
import { Button, Eyebrow } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { playSound } from '@/shared/lib/sound';

const VERDICT: Record<Outcome, { title: string; sub: string; color: string }> = {
  win: { title: 'Victoire', sub: 'Bien joué, vous remportez la manche.', color: 'text-emerald-400' },
  lose: { title: 'Défaite', sub: 'Votre adversaire remporte cette manche.', color: 'text-rose-400' },
  draw: { title: 'Égalité', sub: 'Même choix des deux côtés.', color: 'text-zinc-200' },
};

/** What the winning choice does to the losing one. */
const ATTACK: Record<Choice, string> = {
  pierre: 'La pierre fracasse les ciseaux.',
  ciseau: 'Les ciseaux découpent le papier.',
  papier: 'Le papier étouffe la pierre.',
};

type Props = {
  outcome: Outcome;
  myChoice: Choice;
  opponentChoice: Choice;
  opponentLabel: string;
  onPlayAgain: () => void;
  onLeave: () => void;
};

export function ResultPhase({ outcome, myChoice, opponentChoice, opponentLabel, onPlayAgain, onLeave }: Props) {
  // The verdict stays hidden until the fight has played out.
  const [revealed, setRevealed] = useState(false);
  const reveal = useCallback(() => {
    setRevealed(true);
    playSound(outcome);
  }, [outcome]);

  const verdict = VERDICT[outcome];
  const attack = outcome === 'draw' ? verdict.sub : ATTACK[outcome === 'win' ? myChoice : opponentChoice];
  const sides = [
    { who: 'Vous', choice: myChoice, winner: outcome === 'win', align: 'text-left' },
    { who: opponentLabel, choice: opponentChoice, winner: outcome === 'lose', align: 'text-right' },
  ];

  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-6">
        <Eyebrow>{revealed ? 'Résultat' : 'Combat'}</Eyebrow>
        <h2
          key={String(revealed)}
          className={cn(
            'mt-2 text-4xl sm:text-6xl font-semibold tracking-tight animate-pop',
            revealed ? verdict.color : 'text-zinc-100',
          )}
        >
          {revealed ? verdict.title : `${choiceLabel(myChoice)} contre ${choiceLabel(opponentChoice)}`}
        </h2>
        <p className="mt-3 text-zinc-400">{revealed ? verdict.sub : attack}</p>
      </div>

      <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden mb-8">
        <ChoiceBattle mine={myChoice} theirs={opponentChoice} onDone={reveal} className="h-72 sm:h-96 w-full" />
        <div className="absolute inset-x-0 top-0 z-[25] flex items-start justify-between gap-4 p-4 sm:p-5 pointer-events-none">
          {sides.map((side) => (
            <div key={side.who} className={side.align}>
              <p className="text-xs text-zinc-500">{side.who}</p>
              <p className="text-base sm:text-lg font-semibold tracking-tight">{choiceLabel(side.choice)}</p>
              <span
                className={cn(
                  'mt-1 inline-flex text-[11px] font-medium text-accent border border-accent/40 rounded-full px-2 h-6 items-center transition-opacity duration-500',
                  revealed && side.winner ? 'opacity-100' : 'opacity-0',
                )}
              >
                Gagnant
              </span>
            </div>
          ))}
        </div>
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
