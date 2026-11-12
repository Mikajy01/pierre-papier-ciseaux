import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-zinc-800/80 bg-zinc-900/40', className)} {...props} />;
}
