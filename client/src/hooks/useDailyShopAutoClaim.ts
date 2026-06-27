import { useEffect, useRef } from 'react';
import { showGameToast } from '@/components/ui/GameToast';
import { claimFreeDailyShopRewards } from '@/lib/api';
import { formatDailyReward } from '@/lib/daily-shop-display';
import { overflowToastMessage } from '@/lib/inventory-overflow';
import { getTodaySaoPaulo } from '@/lib/timezone';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';

export function sessionClaimKey(userId: string): string {
  return `abdoria_daily_auto_claim_${userId}_${getTodaySaoPaulo()}`;
}

export function dispatchDailyShopUpdated(detail: {
  user: import('@/types').IUserDocument;
  loja_diaria: import('@/types').LojaDiaria;
  claimed?: import('@/types').LojaDiariaSlot[];
  overflow_to_dorias?: number;
}) {
  window.dispatchEvent(new CustomEvent('abdoria:daily-shop-updated', { detail }));
}

/** Coleta recompensas grátis da loja diária ao entrar no app (quando a preferência está ativa). */
export function useDailyShopAutoClaim() {
  const { user, loading, applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (loading || !user?.id) return;
    if (!user.preferencias?.coletar_loja_diaria_automatico) return;
    if (sessionStorage.getItem(sessionClaimKey(user.id))) return;
    if (inFlightRef.current) return;

    let cancelled = false;
    inFlightRef.current = true;

    void (async () => {
      try {
        const res = await claimFreeDailyShopRewards();
        if (cancelled) return;

        sessionStorage.setItem(sessionClaimKey(user.id), '1');
        applyUser(res.user);
        void refreshApp();

        if (res.claimed.length > 0) {
          const summary = res.claimed.map((slot) => formatDailyReward(slot)).join(' · ');
          showGameToast(`Recompensa diária coletada: ${summary}`, { variant: 'success' });
          dispatchDailyShopUpdated(res);
          const overflowMsg = overflowToastMessage(res.overflow_to_dorias);
          if (overflowMsg) showGameToast(overflowMsg, { variant: 'info' });
        }
      } catch {
        // Falha silenciosa — o jogador pode resgatar manualmente no painel.
      } finally {
        inFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyUser, loading, refreshApp, user?.id, user?.preferencias?.coletar_loja_diaria_automatico]);
}
