import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { CHOICES, ChoiceModel, choiceLabel, type Choice } from '@/entities/choice';
import { Eyebrow } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

type Props = {
  myChoice: Choice | null;
  opponentLabel: string;
  opponentReady: boolean;
  onChoose: (choice: Choice) => void;
};

export function ChoosePhase({ myChoice, opponentLabel, opponentReady, onChoose }: Props) {
  const [hovered, setHovered] = useState<Choice | null>(null);

  // Keyboard shortcuts 1 / 2 / 3
  const onChooseRef = useRef(onChoose);
  onChooseRef.current = onChoose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const option = CHOICES[Number(e.key) - 1];
      if (option) onChooseRef.current(option.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <Eyebrow>Manche en cours</Eyebrow>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Faites votre choix</h2>
        </div>
        <p className="hidden sm:block text-xs text-zinc-500">
          Raccourcis <kbd className="kbd">1</kbd> <kbd className="kbd">2</kbd> <kbd className="kbd">3</kbd>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CHOICES.map((option, i) => {
          const selected = myChoice === option.key;
          const dimmed = myChoice !== null && !selected;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChoose(option.key)}
              onMouseEnter={() => setHovered(option.key)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'group relative text-left rounded-2xl border transition-all duration-300 overflow-hidden',
                selected
                  ? 'border-accent bg-zinc-900 ring-1 ring-accent'
                  : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70',
                dimmed && 'opacity-50 hover:opacity-80',
              )}
            >
              <span className="absolute top-4 left-4 font-mono text-xs text-zinc-600">0{i + 1}</span>
              {selected && (
                <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                  <Check className="w-3.5 h-3.5" /> Choisi
                </span>
              )}
              <ChoiceModel
                kind={option.key}
                active={hovered === option.key || selected}
                className="h-52 md:h-60 w-full pointer-events-none"
              />
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

      <div className="mt-6 h-6 flex items-center justify-center gap-2 text-sm text-zinc-400">
        {myChoice ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Vous avez choisi {choiceLabel(myChoice)}. En attente du choix adverse…
          </>
        ) : (
          opponentReady && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {opponentLabel} : choix verrouillé.
            </>
          )
        )}
      </div>
    </div>
  );
}
