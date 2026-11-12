import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Notify = (message: string) => void;

const ToastContext = createContext<Notify>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const notify = useCallback<Notify>((msg) => {
    setMessage(msg);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message, nonce]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300',
          message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 h-11 text-sm text-zinc-200 shadow-xl shadow-black/40">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          {message}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
