import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getTodaySaoPaulo, secondsUntilSaoPauloMidnight } from '@/lib/timezone';

type MidnightListener = () => void;

type MidnightRefreshContextValue = {
  secondsLeft: number;
  registerMidnightListener: (listener: MidnightListener) => () => void;
};

const MidnightRefreshContext = createContext<MidnightRefreshContextValue | null>(null);

export function MidnightRefreshProvider({ children }: { children: ReactNode }) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilSaoPauloMidnight());
  const lastResetDay = useRef(getTodaySaoPaulo());
  const listeners = useRef(new Set<MidnightListener>());

  const registerMidnightListener = useCallback((listener: MidnightListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const today = getTodaySaoPaulo(now);
      setSecondsLeft(secondsUntilSaoPauloMidnight(now));

      if (today !== lastResetDay.current) {
        lastResetDay.current = today;
        for (const listener of listeners.current) {
          listener();
        }
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo(
    () => ({ secondsLeft, registerMidnightListener }),
    [secondsLeft, registerMidnightListener],
  );

  return (
    <MidnightRefreshContext.Provider value={value}>{children}</MidnightRefreshContext.Provider>
  );
}

export function useMidnightSecondsLeft(): number {
  const ctx = useContext(MidnightRefreshContext);
  if (!ctx) {
    throw new Error('useMidnightSecondsLeft must be used within MidnightRefreshProvider');
  }
  return ctx.secondsLeft;
}

/** Registra callback de meia-noite (SP) sem criar timer extra. */
export function useMidnightRefresh(onReset?: () => void) {
  const ctx = useContext(MidnightRefreshContext);
  const onResetRef = useRef(onReset);

  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  useEffect(() => {
    if (!ctx || !onReset) return;
    return ctx.registerMidnightListener(() => {
      onResetRef.current?.();
    });
  }, [ctx, onReset]);

  return ctx?.secondsLeft ?? secondsUntilSaoPauloMidnight();
}
