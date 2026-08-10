import { useCallback, useEffect, useRef, useState } from 'react';

interface DamageFloater {
  id: number;
  value: number;
  drift: number;
  crit: boolean;
}

export function useDamageFloaters() {
  const [floaters, setFloaters] = useState<DamageFloater[]>([]);
  const timersRef = useRef<number[]>([]);

  const pushDamage = useCallback((value: number, crit = false) => {
    const id = Date.now() + Math.random();
    const drift = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 16);
    setFloaters((previous) => [...previous.slice(-3), { id, value, drift, crit }]);
    const timerId = window.setTimeout(
      () => {
        timersRef.current = timersRef.current.filter((timer) => timer !== timerId);
        setFloaters((previous) => previous.filter((floater) => floater.id !== id));
      },
      crit ? 1050 : 950,
    );
    timersRef.current.push(timerId);
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    },
    [],
  );

  return { floaters, pushDamage };
}
