/* eslint-disable react-refresh/only-export-components -- provider e hooks compartilham contextos privados */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getTodaySaoPaulo, secondsUntilSaoPauloMidnight } from '@/lib/timezone';

type MidnightListener = () => void;

type RegisterMidnightListener = (listener: MidnightListener) => () => void;

const MidnightSecondsContext = createContext<number | null>(null);
const MidnightListenerContext = createContext<RegisterMidnightListener | null>(null);

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
    let lastResumeNotificationAt = 0;

    const notifyListeners = () => {
      for (const listener of [...listeners.current]) {
        listener();
      }
    };

    const tick = (notifyAfterResume = false) => {
      const now = new Date();
      const today = getTodaySaoPaulo(now);
      setSecondsLeft(secondsUntilSaoPauloMidnight(now));

      if (today !== lastResetDay.current) {
        lastResetDay.current = today;
        notifyListeners();
      } else if (notifyAfterResume) {
        notifyListeners();
      }
    };

    const refreshAfterBackground = () => {
      if (document.visibilityState === 'hidden') return;

      // `visibilitychange` e `pageshow` podem ocorrer juntos ao restaurar uma
      // aba/PWA. Um pequeno guard evita duas sincronizações idênticas.
      const now = Date.now();
      const shouldNotify = now - lastResumeNotificationAt > 1_000;
      if (shouldNotify) lastResumeNotificationAt = now;
      tick(shouldNotify);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', refreshAfterBackground);
    window.addEventListener('pageshow', refreshAfterBackground);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshAfterBackground);
      window.removeEventListener('pageshow', refreshAfterBackground);
    };
  }, []);

  return (
    <MidnightListenerContext.Provider value={registerMidnightListener}>
      <MidnightSecondsContext.Provider value={secondsLeft}>
        {children}
      </MidnightSecondsContext.Provider>
    </MidnightListenerContext.Provider>
  );
}

export function useMidnightSecondsLeft(): number {
  const secondsLeft = useContext(MidnightSecondsContext);
  if (secondsLeft === null) {
    throw new Error('useMidnightSecondsLeft must be used within MidnightRefreshProvider');
  }
  return secondsLeft;
}

/** Registra callback de meia-noite (SP) sem criar timer extra. */
export function useMidnightRefresh(onReset?: () => void) {
  const registerMidnightListener = useContext(MidnightListenerContext);
  const onResetRef = useRef(onReset);
  const enabled = typeof onReset === 'function';

  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  useEffect(() => {
    if (!registerMidnightListener || !enabled) return;
    return registerMidnightListener(() => {
      onResetRef.current?.();
    });
  }, [enabled, registerMidnightListener]);
}
