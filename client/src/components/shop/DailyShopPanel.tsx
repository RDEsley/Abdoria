import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Gift, Sparkles } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { DailyShopRewardReveal } from '@/components/shop/DailyShopRewardReveal';
import { DailyShopAutoCollectToggle } from '@/components/shop/DailyShopAutoCollectToggle';
import { PurchaseConfirmDialog, type PurchaseConfirmDetails } from '@/components/shop/PurchaseConfirmDialog';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { claimDailyShopSlot, claimFreeDailyShopRewards, getShop, updateMetaPreferences } from '@/lib/api';
import { overflowToastMessage } from '@/lib/inventory-overflow';
import {
  dailyRewardIcon,
  formatDailyPurchasePrice,
  formatDailyReward,
  isLuckyFreeDailyReward,
} from '@/lib/daily-shop-display';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { dispatchDailyShopUpdated, sessionClaimKey } from '@/hooks/useDailyShopAutoClaim';
import { useMidnightRefresh, useMidnightSecondsLeft } from '@/context/MidnightRefreshContext';
import { formatCountdown } from '@/lib/timezone';
import { scrollToDashboardLevelXp } from '@/lib/dashboard-scroll';
import type { LojaDiariaSlot, ShopResponse } from '@/types';
import {
  CURRENCY_NAME,
  DAILY_LUCK_LABELS,
  DAILY_RARITY_LABELS,
  projectedAbdoriaAfterXpSpend,
  SHOP_ABDORIA_COST_PER_XP,
  SHOP_XP_COST_PER_ABDORIA,
  resolveCosmeticos,
} from '@/types';

function rarityClass(raridade: LojaDiariaSlot['raridade']) {
  return `game-daily-card--${raridade}`;
}

function canAffordSlot(
  slot: LojaDiariaSlot,
  abdoriaBalance: number,
  spendableXp: number,
  nivelXp: number,
  moedasXpBlocos: number,
) {
  if (slot.kind === 'recompensa_diaria') return true;
  const abdoriaCost = slot.preco_abdoria ?? 0;
  const xpCost = slot.preco_xp ?? 0;
  if (xpCost > spendableXp) return false;
  const abdoriaAfterXp = projectedAbdoriaAfterXpSpend(nivelXp, abdoriaBalance, moedasXpBlocos, xpCost);
  if (abdoriaCost > abdoriaAfterXp) return false;
  return true;
}

export function DailyShopPanel() {
  const { user, applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [shopMeta, setShopMeta] = useState<Pick<
    ShopResponse,
    'abdoria' | 'spendable_xp' | 'shop_xp_cost_per_abdoria' | 'shop_abdoria_cost_per_xp' | 'efeito_equipado'
  > | null>(null);
  const [loja, setLoja] = useState<{ data_reset: string; slots: LojaDiariaSlot[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [rewardReveal, setRewardReveal] = useState<{ slot: LojaDiariaSlot; message: string } | null>(null);
  const [autoCollect, setAutoCollect] = useState(
    () => user?.preferencias?.coletar_loja_diaria_automatico ?? false,
  );
  const [savingAutoCollect, setSavingAutoCollect] = useState(false);
  const [purchaseConfirm, setPurchaseConfirm] = useState<{
    slot: LojaDiariaSlot;
    details: PurchaseConfirmDetails;
  } | null>(null);

  useEffect(() => {
    setAutoCollect(user?.preferencias?.coletar_loja_diaria_automatico ?? false);
  }, [user?.preferencias?.coletar_loja_diaria_automatico]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ loja_diaria: { data_reset: string; slots: LojaDiariaSlot[] } }>).detail;
      if (detail?.loja_diaria) setLoja(detail.loja_diaria);
    };
    window.addEventListener('abdoria:daily-shop-updated', handler);
    return () => window.removeEventListener('abdoria:daily-shop-updated', handler);
  }, []);

  const cosmeticos = useMemo(
    () => resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp),
    [user?.cosmeticos, user?.gamificacao.nivel_xp],
  );

  const abdoriaBalance = shopMeta?.abdoria ?? cosmeticos.moedas;
  const moedasXpBlocos = cosmeticos.moedas_xp_blocos;
  const nivelXp = user?.gamificacao.nivel_xp ?? 0;
  const spendableXp = shopMeta?.spendable_xp ?? 0;
  const xpPerAbdoria = shopMeta?.shop_xp_cost_per_abdoria ?? SHOP_XP_COST_PER_ABDORIA;
  const abdoriaPerXp = shopMeta?.shop_abdoria_cost_per_xp ?? SHOP_ABDORIA_COST_PER_XP;
  const effectId = shopMeta?.efeito_equipado ?? cosmeticos.efeito_equipado;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShop();
      setLoja(data.loja_diaria);
      setShopMeta({
        abdoria: data.abdoria,
        spendable_xp: data.spendable_xp,
        shop_xp_cost_per_abdoria: data.shop_xp_cost_per_abdoria,
        shop_abdoria_cost_per_xp: data.shop_abdoria_cost_per_xp,
        efeito_equipado: data.efeito_equipado,
      });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar a loja diária.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useMidnightRefresh(() => {
    void load();
  });

  const resetSecondsLeft = useMidnightSecondsLeft();

  const applyFreeClaimResult = useCallback(
    async (res: Awaited<ReturnType<typeof claimFreeDailyShopRewards>>, opts?: { showReveal?: boolean }) => {
      applyUser(res.user);
      setLoja(res.loja_diaria);
      await refreshApp();

      if (res.claimed.length === 0) return;

      const slot = res.claimed[0]!;
      const lucky = isLuckyFreeDailyReward(slot);
      const successMessage = lucky
        ? (DAILY_LUCK_LABELS[slot.raridade] ?? 'Sorte grande! Recompensa rara resgatada!')
        : 'Recompensa diária resgatada!';

      if (opts?.showReveal) {
        setRewardReveal({ slot, message: successMessage });
      } else {
        const summary = res.claimed.map((entry) => formatDailyReward(entry)).join(' · ');
        showGameToast(`Recompensa diária coletada: ${summary}`, { variant: 'success' });
      }

      const overflowMsg = overflowToastMessage(res.overflow_to_dorias);
      if (overflowMsg) showGameToast(overflowMsg, { variant: 'info' });
    },
    [applyUser, refreshApp],
  );

  const handleToggleAutoCollect = async () => {
    const next = !autoCollect;
    setSavingAutoCollect(true);
    try {
      const updated = await updateMetaPreferences({ coletar_loja_diaria_automatico: next });
      applyUser(updated);
      setAutoCollect(next);

      if (next && user?.id) {
        sessionStorage.removeItem(sessionClaimKey(user.id));
        const res = await claimFreeDailyShopRewards();
        sessionStorage.setItem(sessionClaimKey(user.id), '1');
        dispatchDailyShopUpdated(res);
        await applyFreeClaimResult(res, { showReveal: true });
        void load();
      }
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar a preferência.'), { variant: 'error' });
    } finally {
      setSavingAutoCollect(false);
    }
  };

  const handleClaim = async (slot: LojaDiariaSlot) => {
    setBusySlot(slot.slot);

    try {
      const res = await claimDailyShopSlot(slot.slot);
      applyUser(res.user);
      setLoja(res.loja_diaria);
      await refreshApp();

      const claimedSlot = res.loja_diaria.slots.find((entry) => entry.slot === slot.slot) ?? slot;

      let successMessage = 'Compra realizada!';
      if (slot.kind === 'recompensa_diaria' && isLuckyFreeDailyReward(slot)) {
        successMessage = DAILY_LUCK_LABELS[slot.raridade] ?? 'Sorte grande! Recompensa rara resgatada!';
      } else if (slot.kind === 'recompensa_diaria') {
        successMessage = 'Recompensa diária resgatada!';
      } else {
        successMessage = `${slot.oferta_nome ?? 'Oferta'} comprada com sucesso!`;
      }

      setPurchaseConfirm(null);
      setRewardReveal({ slot: claimedSlot, message: successMessage });
      const overflowMsg = overflowToastMessage(res.overflow_to_dorias);
      if (overflowMsg) showGameToast(overflowMsg, { variant: 'info' });
      void load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível resgatar esta oferta.'), { variant: 'error' });
    } finally {
      setBusySlot(null);
    }
  };

  const requestClaim = (slot: LojaDiariaSlot) => {
    if (slot.kind === 'recompensa_diaria') {
      void handleClaim(slot);
      return;
    }

    setPurchaseConfirm({
      slot,
      details: {
        itemName: slot.oferta_nome ?? formatDailyReward(slot),
        itemDescription: slot.label,
        priceLabel: formatDailyPurchasePrice(slot),
        balanceHint: `${CURRENCY_NAME}: ${abdoriaBalance} · XP disponível: ${spendableXp}`,
      },
    });
  };

  return (
    <>
      <section className="glass-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="game-section-title !mb-0 flex items-center gap-2">
                <Gift size={14} className="text-emerald-600" /> Loja diária
              </h3>
              <p className="game-daily-reset-inline" aria-live="polite">
                <Clock size={13} aria-hidden />
                Renova em <strong className="tabular-nums">{formatCountdown(resetSecondsLeft)}</strong>
              </p>
            </div>
            <p className="mt-1 text-[0.65rem] font-bold leading-relaxed text-stone-500">
              1ª opção grátis · {xpPerAbdoria} XP = 1 {CURRENCY_NAME} · {abdoriaPerXp} {CURRENCY_NAME} = 1 XP
            </p>
            {shopMeta && (
              <p className="mt-1 text-[0.65rem] font-bold text-emerald-700">
                {CURRENCY_NAME}: <strong>{shopMeta.abdoria}</strong> ·{' '}
                <button
                  type="button"
                  onClick={scrollToDashboardLevelXp}
                  className="game-daily-xp-link"
                  aria-label={`Ver detalhes de nível e XP. ${shopMeta.spendable_xp} XP disponíveis para trocas hoje.`}
                >
                  XP disponível para trocas hoje: <strong>{shopMeta.spendable_xp}</strong>
                </button>
              </p>
            )}
          </div>
          <Sparkles size={18} className="text-amber-500" aria-hidden />
        </div>

        <DailyShopAutoCollectToggle
          checked={autoCollect}
          disabled={savingAutoCollect}
          onToggle={() => void handleToggleAutoCollect()}
        />

        {loading ? (
          <p className="game-loader mt-4">Carregando ofertas...</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {loja?.slots.map((slot) => {
                const lucky = isLuckyFreeDailyReward(slot) && !slot.resgatado;
                const affordable = canAffordSlot(
                  slot,
                  abdoriaBalance,
                  spendableXp,
                  nivelXp,
                  moedasXpBlocos,
                );

                return (
                  <article
                    key={slot.slot}
                    className={`game-daily-card ${rarityClass(slot.raridade)} ${slot.resgatado ? 'game-daily-card--claimed' : ''} ${lucky ? 'game-daily-card--lucky' : ''}`}
                  >
                    {lucky && (
                      <motion.div
                        className={`game-daily-luck game-daily-luck--${slot.raridade}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      >
                        <Sparkles size={14} aria-hidden />
                        <span>{DAILY_LUCK_LABELS[slot.raridade]}</span>
                      </motion.div>
                    )}

                    <div className="game-daily-card__badge">
                      {slot.kind === 'recompensa_diaria' ? 'Diária grátis' : slot.oferta_nome ?? 'Oferta paga'}
                    </div>

                    <div className="game-daily-card__reward">
                      {dailyRewardIcon(slot)}
                      <span>{formatDailyReward(slot)}</span>
                    </div>

                    <p className="game-daily-card__rarity">{DAILY_RARITY_LABELS[slot.raridade]}</p>
                    <p className="game-daily-card__label">{slot.label}</p>

                    {slot.resgatado ? (
                      <div className="game-daily-card__claimed">
                        <span>Resgatado</span>
                      </div>
                    ) : (
                      <GameButton
                        size="sm"
                        className="w-full mt-3"
                        variant={slot.kind === 'recompensa_diaria' ? 'primary' : 'secondary'}
                        disabled={busySlot === slot.slot || !affordable}
                        onClick={() => void requestClaim(slot)}
                      >
                        {slot.kind === 'recompensa_diaria'
                          ? 'Resgatar grátis'
                          : `Comprar · ${formatDailyPurchasePrice(slot)}`}
                      </GameButton>
                    )}
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {rewardReveal && (
        <DailyShopRewardReveal
          slot={rewardReveal.slot}
          message={rewardReveal.message}
          effectId={effectId}
          onClose={() => setRewardReveal(null)}
        />
      )}

      <PurchaseConfirmDialog
        open={!!purchaseConfirm}
        details={purchaseConfirm?.details ?? null}
        busy={!!purchaseConfirm && busySlot === purchaseConfirm.slot.slot}
        onConfirm={() => purchaseConfirm && void handleClaim(purchaseConfirm.slot)}
        onCancel={() => {
          if (busySlot === null) setPurchaseConfirm(null);
        }}
      />
    </>
  );
}
