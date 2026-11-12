import { useCallback, useState } from 'react';

export function useClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetAfterMs);
      } catch (err) {
        console.error('Copie impossible :', err);
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
