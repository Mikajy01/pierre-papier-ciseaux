import { useEffect, useState } from 'react';

/** Ticks from `from` down to 0 once per second while `running` is true. */
export function useCountdown(running: boolean, from = 3) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    setValue(from);
    if (!running) return;
    const id = setInterval(() => setValue((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running, from]);

  return value;
}
