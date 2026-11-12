import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { ChoiceSceneProps } from './three/ChoiceScene';

// three.js is heavy: every 3D scene is loaded in its own chunk.
const ChoiceSceneLazy = lazy(() => import('./three/ChoiceScene').then((m) => ({ default: m.ChoiceScene })));
const HeroSceneLazy = lazy(() => import('./three/ChoiceScene').then((m) => ({ default: m.HeroScene })));

function Fallback({ className }: { className?: string }) {
  return (
    <div className={`${className ?? ''} flex items-center justify-center`}>
      <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
    </div>
  );
}

/** A single floating 3D model of a choice. */
export function ChoiceModel({ className, ...props }: ChoiceSceneProps) {
  return (
    <Suspense fallback={<Fallback className={className} />}>
      <ChoiceSceneLazy className={className} {...props} />
    </Suspense>
  );
}

/** Rock, paper and scissors side by side. */
export function ChoiceHero({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Fallback className={className} />}>
      <HeroSceneLazy className={className} />
    </Suspense>
  );
}
