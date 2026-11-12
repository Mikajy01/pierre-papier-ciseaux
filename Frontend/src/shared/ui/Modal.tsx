import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, aside, children, className }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 outline-none animate-modal-in',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 h-14 px-5 border-b border-zinc-800/80">
          <div className="text-sm font-medium">{title}</div>
          <div className="flex items-center gap-3">
            {aside}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
