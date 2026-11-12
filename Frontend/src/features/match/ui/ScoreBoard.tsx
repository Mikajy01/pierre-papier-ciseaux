import type { Score } from '@/entities/match';

export function ScoreBoard({ score, opponentLabel }: { score: Score; opponentLabel: string }) {
  return (
    <div className="inline-flex items-center gap-3 h-9 px-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs">
      <span className="text-zinc-400">Vous</span>
      <span className="font-mono text-sm text-zinc-100 tabular-nums">
        {score.me} <span className="text-zinc-600">:</span> {score.opponent}
      </span>
      <span className="text-zinc-400">{opponentLabel}</span>
      {score.draws > 0 && <span className="text-zinc-600">· {score.draws} nul{score.draws > 1 ? 's' : ''}</span>}
    </div>
  );
}
