import { ChoiceHero } from '@/entities/choice';

export function HomePage() {
  return (
    <div className="w-full max-w-4xl text-center">
      <ChoiceHero className="h-64 sm:h-80 w-full" />
      <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight">
        Pierre. Papier. <span className="text-accent">Ciseaux.</span>
      </h1>
      <p className="mt-4 text-zinc-400 text-base sm:text-lg max-w-xl mx-auto">
        Créez une partie et partagez le code, ou rejoignez celle d’un ami.
      </p>
    </div>
  );
}
