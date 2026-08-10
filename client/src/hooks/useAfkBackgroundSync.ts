import { useCallback, useEffect } from 'react';
import { pingAfk, setAfkAway, type AfkPingResponse } from '@/lib/api';

const AFK_PING_INTERVAL_MS = 60_000;

function dispatchAfkSync(detail: AfkPingResponse) {
  // `detail.bestiario_novos` alimenta o AchievementProvider (notificações de bestiário).
  window.dispatchEvent(new CustomEvent('abdoria:afk-sync', { detail }));
}

/** Sincroniza Exploração AFK no servidor: ao voltar ao app, ao fechar aba e a cada minuto em foreground. */
export function useAfkBackgroundSync(enabled: boolean) {
  const sync = useCallback(async () => {
    try {
      const res = await pingAfk();
      dispatchAfkSync(res);
    } catch {
      // offline ou sessão expirada — ignorar
    }
  }, []);

  const activateAwayMode = useCallback(async () => {
    try {
      const res = await setAfkAway();
      dispatchAfkSync(res);
    } catch {
      // A requisição keepalive é melhor esforço; o próximo sync reconcilia.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    void sync();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void sync();
      else void activateAwayMode();
    };

    const onPageHide = () => {
      void activateAwayMode();
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
  }, [activateAwayMode, enabled, sync]);
}
