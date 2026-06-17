import { useEffect, useRef, useState } from 'react';
import { getTodaySaoPaulo, secondsUntilSaoPauloMidnight } from '@/lib/timezone';

export function useDailyShopResetCountdown(onReset?: () => void) {
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
      const nextSeconds = secondsUntilSaoPauloMidnight(now);

      setSecondsLeft(nextSeconds);

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
