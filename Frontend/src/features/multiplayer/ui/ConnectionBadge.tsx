import type { ConnectionStatus } from '../model/useMultiplayer';
import { cn } from '@/shared/lib/cn';

const LABEL: Record<ConnectionStatus, string> = {
  idle: 'Hors ligne',
  connecting: 'Connexion…',
  connected: 'Connecté',
  disconnected: 'Déconnecté',
};

export function ConnectionBadge({ status, className }: { status: ConnectionStatus; className?: string }) {
  const online = status === 'connected';
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs', className)}>
      <span className="relative flex w-2 h-2">
        {online && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
        <span
          className={cn(
            'relative w-2 h-2 rounded-full',
            online ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-zinc-600',
          )}
        />
      </span>
      <span className={online ? 'text-zinc-300' : 'text-zinc-500'}>{LABEL[status]}</span>
    </span>
  );
}
