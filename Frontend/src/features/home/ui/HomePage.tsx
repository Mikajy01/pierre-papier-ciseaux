import type { ReactNode } from 'react';
import { ArrowRight, Bot, Users } from 'lucide-react';
import { ChoiceHero } from '@/entities/choice';

type Props = {
  onPlayBot: () => void;
  onPlayMultiplayer: () => void;
};

export function HomePage({ onPlayBot, onPlayMultiplayer }: Props) {
  return (
    <div className="w-full max-w-4xl text-center">
      <ChoiceHero className="h-56 sm:h-80 w-full" />
      <h1 className="mt-4 sm:mt-6 text-4xl sm:text-6xl font-semibold tracking-tight">
        Pierre. Papier. <span className="text-accent">Ciseaux.</span>
      </h1>
      <p className="mt-4 text-zinc-400 text-base sm:text-lg max-w-xl mx-auto">
        Entraînez-vous contre le bot ou défiez un ami en temps réel. Une manche, trois secondes, un gagnant.
      </p>

      <div className="mt-10 grid sm:grid-cols-2 gap-3 sm:gap-4 text-left">
        <ModeCard
          index="01"
          icon={<Bot className="w-5 h-5" />}
          title="Jouer contre le bot"
          description="Partie solo instantanée, sans connexion."
          onClick={onPlayBot}
        />
        <ModeCard
          index="02"
          icon={<Users className="w-5 h-5" />}
          title="Multijoueur"
          description="Créez une partie ou rejoignez-en une avec un code."
          onClick={onPlayMultiplayer}
          highlight
        />
      </div>
    </div>
  );
}

type ModeCardProps = {
  index: string;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
};

function ModeCard({ index, icon, title, description, onClick, highlight }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col gap-4 sm:gap-6 p-5 sm:p-6 rounded-2xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 ${
        highlight
          ? 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
          : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center justify-center w-11 h-11 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 group-hover:text-accent transition-colors">
          {icon}
        </span>
        <span className="font-mono text-xs text-zinc-600">{index}</span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
        <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-zinc-50 text-zinc-950 transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}
