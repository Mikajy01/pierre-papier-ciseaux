import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { ModelKind } from './Choice3D';

// three.js is heavy: load it in a separate chunk.
const ChoiceSceneLazy = lazy(() => import('./Choice3D').then((m) => ({ default: m.ChoiceScene })));
const HeroSceneLazy = lazy(() => import('./Choice3D').then((m) => ({ default: m.HeroScene })));

function Fallback({ className }: { className?: string }) {
  return (
    <div className={`${className ?? ''} flex items-center justify-center`}>
      <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
    </div>
  );
}

type ChoiceModelProps = { kind: ModelKind; active?: boolean; className?: string };

export function ChoiceModel({ className, ...props }: ChoiceModelProps) {
  return (
    <Suspense fallback={<Fallback className={className} />}>
      <ChoiceSceneLazy className={className} {...props} />
    </Suspense>
  );
}

export function ChoiceHero({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Fallback className={className} />}>
      <HeroSceneLazy className={className} />
    </Suspense>
  );
}
