type WakeLockSentinelLike = EventTarget & {
  released: boolean;
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

/** Mantém a tela acesa durante o treino e readquire o lock ao voltar ao app. */
export function keepScreenAwake(): () => void {
  let active = true;
  let sentinel: WakeLockSentinelLike | null = null;

  const acquire = async () => {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!active || document.visibilityState !== 'visible' || !wakeLock || sentinel) return;
    try {
      const next = await wakeLock.request('screen');
      if (!active) {
        await next.release();
        return;
      }
      sentinel = next;
      next.addEventListener('release', () => {
        if (sentinel === next) sentinel = null;
        if (active) void acquire();
      });
    } catch {
      // Suporte depende do navegador; não interrompe o Player.
    }
  };

  const reacquire = () => void acquire();
  document.addEventListener('visibilitychange', reacquire);
  window.addEventListener('focus', reacquire);
  void acquire();

  return () => {
    active = false;
    document.removeEventListener('visibilitychange', reacquire);
    window.removeEventListener('focus', reacquire);
    const current = sentinel;
    sentinel = null;
    if (current && !current.released) void current.release();
  };
}
