import { ChoiceStage } from '@/entities/choice';
import { ErrorBoundary } from '@/shared/ui';
import { BootScreen } from './boot/BootScreen';
import { useBoot } from './boot/useBoot';
import { Game } from './Game';

/**
 * Start-up sequence: a loading screen covers the page while the 3D engine is downloaded,
 * the models are built and the GPU is prepared. All of that happens once; the game is only
 * mounted afterwards, so no screen ever has to load anything again.
 */
export function App() {
  const boot = useBoot();
  const stageMounted = boot.phase === 'warming' || boot.phase === 'ready';

  return (
    <>
      {stageMounted && (
        <ErrorBoundary onError={boot.fail}>
          <ChoiceStage onReady={boot.ready} />
        </ErrorBoundary>
      )}
      {boot.phase === 'ready' && <Game />}
      <BootScreen
        progress={boot.progress}
        label={boot.label}
        done={boot.phase === 'ready'}
        error={boot.phase === 'error' ? boot.error : undefined}
      />
    </>
  );
}
