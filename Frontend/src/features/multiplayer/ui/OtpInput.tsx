import { cn } from '@/shared/lib/cn';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

/** One real input laid over N visual boxes: native paste, autofill and mobile keyboards just work. */
export function OtpInput({ value, onChange, onComplete, length = 4, disabled }: Props) {
  return (
    <label className="relative flex justify-center gap-2 sm:gap-3 cursor-text">
      <input
        autoFocus
        value={value}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Code de la partie"
        maxLength={length}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, length);
          onChange(next);
          if (next.length === length) onComplete?.(next);
        }}
        className="peer absolute inset-0 w-full h-full opacity-0 cursor-text"
      />
      {Array.from({ length }, (_, i) => {
        const active = i === Math.min(value.length, length - 1);
        return (
          <span
            key={i}
            className={cn(
              'w-14 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-xl border bg-zinc-900 font-mono text-3xl sm:text-4xl transition-colors',
              'border-zinc-800',
              active && 'peer-focus:border-accent',
              disabled && 'opacity-50',
            )}
          >
            {value[i] ?? <span className="text-zinc-700">·</span>}
          </span>
        );
      })}
    </label>
  );
}
