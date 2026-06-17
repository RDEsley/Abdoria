import { useEffect, useRef, useState } from 'react';
import { getTodaySaoPaulo, secondsUntilSaoPauloMidnight } from '@/lib/timezone';

/** Dispara callback ao cruzar meia-noite em America/Sao_Paulo. */
export function useSaoPauloMidnightRefresh(onReset?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilSaoPauloMidnight());
  const lastResetDay = useRef(getTodaySaoPaulo());
  const onResetRef = useRef(onReset);

  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const today = getTodaySaoPaulo(now);
      setSecondsLeft(secondsUntilSaoPauloMidnight(now));

      if (today !== lastResetDay.current) {
        lastResetDay.current = today;
        onResetRef.current?.();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return secondsLeft;
}
