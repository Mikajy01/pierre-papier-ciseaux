import { ChoiceModel, type Choice } from '@/entities/choice';
import { Eyebrow, Panel } from '@/shared/ui';

type Props = { countdown: number; myChoice: Choice | null; opponentLabel: string };

export function CountdownPhase({ countdown, myChoice, opponentLabel }: Props) {
  return (
    <div className="w-full max-w-3xl text-center">
      <Eyebrow>Révélation dans</Eyebrow>
      <div key={countdown} className="mt-2 font-mono text-8xl sm:text-9xl font-medium text-accent animate-pop">
        {countdown}
      </div>
      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Panel className="overflow-hidden">
          <ChoiceModel kind={myChoice ?? 'unknown'} className="h-44 sm:h-56 w-full" />
          <p className="pb-4 text-sm text-zinc-400">Vous</p>
        </Panel>
        <span className="font-mono text-sm text-zinc-600">VS</span>
        <Panel className="overflow-hidden">
          <ChoiceModel kind="unknown" className="h-44 sm:h-56 w-full" />
          <p className="pb-4 text-sm text-zinc-400">{opponentLabel}</p>
        </Panel>
      </div>
    </div>
  );
}
