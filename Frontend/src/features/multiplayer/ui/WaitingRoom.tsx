import { Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useClipboard } from '@/shared/lib/useClipboard';

export function WaitingRoom({ otp }: { otp: string }) {
  const { copied, copy } = useClipboard();
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 text-xs text-zinc-400 border border-zinc-800 rounded-full px-3 h-7">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        En attente d'un adversaire
      </div>
      <h2 className="mt-6 text-2xl sm:text-3xl font-semibold tracking-tight">Partagez ce code</h2>
      <p className="mt-2 text-zinc-500 text-sm">La partie démarre dès que votre ami le saisit.</p>
      <div className="mt-8 flex justify-center gap-2 sm:gap-3">
        {otp.split('').map((digit, i) => (
          <div
            key={i}
            className="w-14 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-3xl sm:text-4xl"
          >
            {digit}
          </div>
        ))}
      </div>
      <Button variant="secondary" className="mt-8" onClick={() => copy(otp)}>
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copié' : 'Copier le code'}
      </Button>
    </div>
  );
}
