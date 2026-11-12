import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500', className)}>{children}</p>
  );
}
