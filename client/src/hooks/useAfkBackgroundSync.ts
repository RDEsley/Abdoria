import { useCallback, useEffect } from 'react';
import { pingAfk, type AfkPingResponse } from '@/lib/api';

const AFK_PING_INTERVAL_MS = 60_000;

function dispatchAfkSync(detail: AfkPingResponse) {
  window.dispatchEvent(new CustomEvent('abdoria:afk-sync', { detail }));
}

/** Sincroniza patrulha AFK no servidor: ao voltar ao app, ao fechar aba e a cada minuto em foreground. */
export function useAfkBackgroundSync(enabled: boolean) {
  const sync = useCallback(async () => {
    try {
      const res = await pingAfk();
      dispatchAfkSync(res);
    } catch {
      // offline ou sessão expirada — ignorar
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    void sync();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    };

    const onPageHide = () => {
      void sync();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    }, AFK_PING_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.clearInterval(timer);
    };
  }, [enabled, sync]);
}
