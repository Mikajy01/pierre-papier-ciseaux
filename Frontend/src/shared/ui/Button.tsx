import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-zinc-50 text-zinc-950 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500',
  secondary:
    'border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-40',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 disabled:opacity-40',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = 'primary', className, type = 'button', ...props }: Props) {
  return <button type={type} className={cn(base, variants[variant], className)} {...props} />;
}
