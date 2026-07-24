import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Backpack, BookOpen, TreePine, X } from 'lucide-react';
import { BestiaryModal } from '@/components/bestiary/BestiaryModal';
import { AfkCombatScene } from '@/components/afk/AfkCombatScene';
import { AfkVillageScene } from '@/components/afk/AfkVillageScene';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import {
  EXPLORATION_TUTORIAL_KEY,
  EXPLORATION_TUTORIAL_SLIDES,
} from '@/components/afk/exploration-tutorial-slides';
import { AfkRewardCelebration } from '@/components/afk/AfkRewardCelebration';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { InventoryModal } from '@/components/inventory/InventoryModal';
import {
  buildRewardPresentationFromAfk,
  partitionRewardPresentation,
} from '@/lib/reward-presentation';
import { useRewardPresentation } from '@/context/RewardPresentationContext';
import { AfkRewardGrid } from '@/components/afk/AfkRewardGrid';
import { AfkTimerPanel } from '@/components/afk/AfkTimerPanel';
import { PatrolShopModal } from '@/components/afk/patrol-shop/PatrolShopModal';
import { GameButton } from '@/components/ui/GameButton';
import { claimAfkRewards, getAfkMeta, type AfkMetaResponse } from '@/lib/api';
import { DEV_REWARD_PREVIEW_EVENT } from '@/lib/dev-reward-preview';
import { overflowToastMessage } from '@/lib/inventory-overflow';
import { mergeAfkCombatSnapshot } from '@/lib/afk-combat-merge';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import type { AfkPendingReward, ArmaPreferida } from '@/types';
import { ALL_BESTIARY_ENEMY_IDS, resolvePatrolArmas } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AfkPatrolModal({ open, onClose }: Props) {
  const { user, applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const [meta, setMeta] = useState<AfkMetaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { presentRewards } = useRewardPresentation();
  const [elapsedSinceSyncMin, setElapsedSinceSyncMin] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [bestiaryOpen, setBestiaryOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  /** Hub entre patrulhas: a vila (loja + bestiário) x a cena de combate ao vivo. */
  const [sceneMode, setSceneMode] = useState<'exploring' | 'village'>('exploring');
  const [showTutorial, setShowTutorial] = useState(false);
  const [celebrationClaimed, setCelebrationClaimed] = useState<AfkPendingReward | null>(null);
  const loadedAtRef = useRef(0);
  const syncedMinutosRef = useRef<number | null>(null);
  /** true depois da 1ª carga bem-sucedida — refreshes em segundo plano (poll,
      claim, troca de arma, fechar inventário) não devem mais piscar o loading. */
  const hasLoadedRef = useRef(false);

  const reconcileTimerFromServer = useCallback((serverMinutos: number) => {
    const prev = syncedMinutosRef.current;
    if (prev === null || serverMinutos !== prev) {
      syncedMinutosRef.current = serverMinutos;
      loadedAtRef.current = Date.now();
      setElapsedSinceSyncMin(0);
    }
  }, []);

  const preferredWeapon: ArmaPreferida =
    meta?.arma_preferida ?? user?.preferencias?.arma_preferida ?? 'arco';
  const patrolArmas = resolvePatrolArmas(user?.preferencias?.patrol_armas);
  // Sem magia equipada, o modo magia cai de volta pro arco.
  const weapon: ArmaPreferida =
    preferredWeapon === 'magia' && !patrolArmas.magia_equipada ? 'arco' : preferredWeapon;
  const weaponId =
    weapon === 'arco'
      ? patrolArmas.arco_equipado
      : weapon === 'espada'
        ? patrolArmas.espada_equipada
        : (patrolArmas.magia_equipada ?? patrolArmas.arco_equipado);
  const userId = String(user?.id ?? 'guest');

  const load = useCallback(async () => {
    // Só a 1ª carga mostra o estado de loading (timer "--:--:--", botão desabilitado).
    // Refreshes em segundo plano (poll de 15s, claim, troca de arma, fechar
    // inventário) atualizam o meta silenciosamente — sem isso, a UI piscava
    // "carregando" e desabilitava o Coletar a cada sync, parecendo bugado.
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setLoading(true);
    try {
      const data = await getAfkMeta();
      setMeta((prev) => ({
        ...data,
        combat: mergeAfkCombatSnapshot(prev?.combat, data.combat),
        route_drink_count: data.route_drink_count,
      }));
      reconcileTimerFromServer(data.minutos_acumulados);
      hasLoadedRef.current = true;
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar a exploração.'), {
        variant: 'error',
      });
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [reconcileTimerFromServer]);

  useEffect(() => {
    if (!open) {
      syncedMinutosRef.current = null;
      hasLoadedRef.current = false;
      setShopOpen(false);
      setBestiaryOpen(false);
      setInventoryOpen(false);
      setCelebrationClaimed(null);
      setSceneMode('exploring');
      return;
    }
    if (!window.localStorage.getItem(EXPLORATION_TUTORIAL_KEY)) {
      setShowTutorial(true);
    }
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;

    const combatPoll = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => window.clearInterval(combatPoll);
  }, [open, load]);

  useEffect(() => {
    const onAfkSync = (event: Event) => {
      const detail = (event as CustomEvent<AfkMetaResponse & { ok?: boolean }>).detail;
      if (!detail) return;
      setMeta((prev) => ({
        ...(prev ?? ({} as AfkMetaResponse)),
        minutos_acumulados: detail.minutos_acumulados,
        pending: detail.pending,
        has_rewards: detail.has_rewards,
        kill_drop_chance: detail.kill_drop_chance ?? prev?.kill_drop_chance ?? 4,
        kill_drop_chances: detail.kill_drop_chances ?? prev?.kill_drop_chances,
        max_minutes: detail.max_minutes ?? prev?.max_minutes ?? 1440,
        capped: detail.capped ?? prev?.capped ?? false,
        arma_preferida: detail.arma_preferida ?? prev?.arma_preferida ?? 'arco',
        combat: mergeAfkCombatSnapshot(prev?.combat, detail.combat),
      }));
      reconcileTimerFromServer(detail.minutos_acumulados);
    };
    window.addEventListener('abdoria:afk-sync', onAfkSync);
    return () => window.removeEventListener('abdoria:afk-sync', onAfkSync);
  }, [reconcileTimerFromServer]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const onDevCelebration = (event: Event) => {
      const claimed = (event as CustomEvent<AfkPendingReward>).detail;
      if (claimed) setCelebrationClaimed(claimed);
    };
    window.addEventListener(DEV_REWARD_PREVIEW_EVENT, onDevCelebration);
    return () => window.removeEventListener(DEV_REWARD_PREVIEW_EVENT, onDevCelebration);
  }, []);

  const showClaimedCelebration = useCallback((claimed: AfkPendingReward, overflowToDorias = 0) => {
    setCelebrationClaimed(claimed);
    const overflowMsg = overflowToastMessage(overflowToDorias);
    if (overflowMsg) showGameToast(overflowMsg, { variant: 'info' });
  }, []);

  useEffect(() => {
    if (!open || meta?.capped) return undefined;
    const timer = window.setInterval(() => {
      setElapsedSinceSyncMin((Date.now() - loadedAtRef.current) / 60_000);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, meta?.capped]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (shopOpen) {
        setShopOpen(false);
        return;
      }
      if (inventoryOpen) {
        setInventoryOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, shopOpen, inventoryOpen]);

  const handleTutorialClose = useCallback(() => {
    window.localStorage.setItem(EXPLORATION_TUTORIAL_KEY, '1');
    setShowTutorial(false);
  }, []);

  const handleCelebrationClose = useCallback(() => {
    setCelebrationClaimed((claimed) => {
      if (claimed) {
        const { secrets } = partitionRewardPresentation(buildRewardPresentationFromAfk(claimed));
        if (secrets.length > 0) {
          presentRewards(secrets);
        }
      }
      return null;
    });
  }, [presentRewards]);

  const handleClaim = async () => {
    if (!meta?.has_rewards) return;
    setClaiming(true);
    try {
      const res = await claimAfkRewards();
      applyUser(res.user);
      await refreshApp();
      showClaimedCelebration(res.claimed, res.overflow_to_dorias);
      await load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível coletar recompensas.'), {
        variant: 'error',
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  const capped = meta?.capped ?? false;
  const inventoryItemCount =
    (stats?.frozen_streak_count ?? 0) +
    (stats?.route_drink_count ?? meta?.route_drink_count ?? 0) +
    (stats?.exp_instant_count ?? 0) +
    (stats?.doria_bag_count ?? 0);

  const handleInventoryClose = () => {
    setInventoryOpen(false);
    void load();
  };

  return createPortal(
    <>
      <div
        className="game-afk-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="afk-patrol-title"
        onClick={onClose}
      >
        <motion.div
          className="game-afk-modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="game-afk-modal__topbar">
            <div className="game-afk-modal__title-group">
              <button
                type="button"
                className="game-afk-modal__title-icon game-afk-modal__title-icon--btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSceneMode((m) => (m === 'village' ? 'exploring' : 'village'));
                }}
                title={sceneMode === 'village' ? 'Voltar a explorar' : 'Voltar à vila'}
                aria-label={sceneMode === 'village' ? 'Voltar a explorar' : 'Voltar à vila'}
                aria-pressed={sceneMode === 'village'}
              >
                {sceneMode === 'village' ? (
                  <AfkFabSwords variant="header" />
                ) : (
                  <TreePine size={24} aria-hidden />
                )}
              </button>
              <h2 id="afk-patrol-title" className="game-afk-modal__title">
                Exploração
              </h2>
            </div>
            <div className="game-afk-modal__toolbar">
              <button
                type="button"
                className="game-afk-modal__shop-btn game-afk-modal__shop-btn--icon game-afk-modal__shop-btn--inventory"
                onClick={(e) => {
                  e.stopPropagation();
                  setInventoryOpen(true);
                }}
                title="Inventário"
                aria-label={
                  inventoryItemCount > 0
                    ? `Abrir inventário, ${inventoryItemCount} itens`
                    : 'Abrir inventário'
                }
              >
                <Backpack size={26} aria-hidden />
                {inventoryItemCount > 0 && (
                  <span className="game-afk-modal__inventory-badge tabular-nums">
                    {inventoryItemCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="game-afk-modal__shop-btn game-afk-modal__shop-btn--icon game-afk-modal__shop-btn--bestiary"
                onClick={(e) => {
                  e.stopPropagation();
                  setBestiaryOpen(true);
                }}
                title="Bestiário"
                aria-label="Abrir bestiário da exploração"
              >
                <BookOpen size={26} aria-hidden />
                <span className="game-afk-modal__inventory-badge tabular-nums">
                  {stats?.bestiario_desbloqueados?.length ?? 0}/{ALL_BESTIARY_ENEMY_IDS.length}
                </span>
              </button>
              <button
                type="button"
                className="game-afk-modal__shop-btn game-afk-modal__shop-btn--icon game-afk-modal__shop-btn--close"
                onClick={onClose}
                title="Fechar"
                aria-label="Fechar exploração"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
          </div>

          {sceneMode === 'village' ? (
            <AfkVillageScene
              weapon={weapon}
              bestiaryUnlocked={stats?.bestiario_desbloqueados?.length ?? 0}
              bestiaryTotal={ALL_BESTIARY_ENEMY_IDS.length}
              onOpenShop={() => setShopOpen(true)}
              onOpenBestiary={() => setBestiaryOpen(true)}
              onContinue={() => setSceneMode('exploring')}
            />
          ) : (
            <AfkCombatScene
              userId={userId}
              weapon={weapon}
              weaponId={weaponId}
              combat={meta?.combat ?? null}
              hasLoot={meta?.has_rewards}
              capped={capped}
            />
          )}

          <div className="game-afk-dock">
            <AfkTimerPanel
              minutos={meta?.minutos_acumulados ?? 0}
              elapsedSinceSyncMin={elapsedSinceSyncMin}
              capped={capped}
              loading={loading}
              dropChances={meta?.kill_drop_chances}
            />

            <div className="game-afk-dock__loot">
              <AfkRewardGrid pending={meta?.pending} withChest />
            </div>

            <div className="game-afk-modal__footer">
              <GameButton
                className={`game-afk-claim-btn${meta?.has_rewards ? ' game-afk-claim-btn--ready' : ''}`}
                size="lg"
                disabled={claiming || loading}
                onClick={() => void handleClaim()}
                aria-label={
                  claiming
                    ? 'Coletando recompensas'
                    : meta?.has_rewards
                      ? 'Coletar recompensas da exploração'
                      : 'Coletar'
                }
              >
                {claiming ? 'Coletando...' : 'Coletar'}
              </GameButton>
            </div>
          </div>
        </motion.div>
      </div>

      <PatrolShopModal
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        onWeaponChange={() => {
          void load();
        }}
      />

      {celebrationClaimed && (
        <AfkRewardCelebration claimed={celebrationClaimed} onClose={handleCelebrationClose} />
      )}

      <InventoryModal open={inventoryOpen} onClose={handleInventoryClose} layer="modal" />
      <BestiaryModal open={bestiaryOpen} onClose={() => setBestiaryOpen(false)} layer="modal" />

      <TutorialOverlay
        open={showTutorial}
        onClose={handleTutorialClose}
        slides={EXPLORATION_TUTORIAL_SLIDES}
        ctaLabel="Vamos explorar!"
      />
    </>,
    document.body,
  );
}
