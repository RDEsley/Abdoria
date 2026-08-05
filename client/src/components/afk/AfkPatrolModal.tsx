import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Backpack, TreePine, X } from 'lucide-react';
import { BestiaryModal } from '@/components/bestiary/BestiaryModal';
import { AfkCombatScene } from '@/components/afk/AfkCombatScene';
import { AfkVillageScene } from '@/components/afk/AfkVillageScene';
import { ExplorationIntroFlow } from '@/components/afk/ExplorationIntroFlow';
import { SceneTransitionOverlay } from '@/components/afk/SceneTransitionOverlay';
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
import { claimAfkRewards, getAfkMeta, setAfkScene, type AfkMetaResponse } from '@/lib/api';
import { DEV_REWARD_PREVIEW_EVENT } from '@/lib/dev-reward-preview';
import { overflowToastMessage } from '@/lib/inventory-overflow';
import { mergeAfkCombatSnapshot } from '@/lib/afk-combat-merge';
import { emitXpEarned } from '@/lib/xp-orbs';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import type { AfkPendingReward, ArmaPreferida, LevelUpCelebration, PersonagemGenero } from '@/types';
import { ALL_BESTIARY_ENEMY_IDS, resolvePatrolArmas } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 'page' renderiza como tela cheia (rota /exploracao), sem overlay de
      diálogo — usado pela ExplorationPage. Padrão: modal flutuante. */
  variant?: 'modal' | 'page';
}

export function AfkPatrolModal({ open, onClose, variant = 'modal' }: Props) {
  const isPage = variant === 'page';
  const { user, applyUser } = useAuth();
  const { refresh: refreshApp, stats } = useApp();
  const [meta, setMeta] = useState<AfkMetaResponse | null>(null);
  // Começa true de propósito: a 1ª renderização acontece ANTES do load()
  // assíncrono terminar, e sceneMode nasce sempre 'village' (valor inicial
  // fixo) — sem esse gate, quem estava explorando via um flash da vila até
  // o servidor confirmar a cena real e trocar pra 'exploring'.
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const { presentRewards } = useRewardPresentation();
  const [elapsedSinceSyncMin, setElapsedSinceSyncMin] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [bestiaryOpen, setBestiaryOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  /** Hub entre patrulhas: a vila (loja + bestiário) x a cena de combate ao vivo.
      Personagem novo começa na vila até clicar em "Explorar"; depois disso a
      cena de abertura vem do servidor (ver load()/data.paused) — fechar a
      tela explorando reabre explorando, fechar na vila manda explorar sozinho. */
  const [sceneMode, setSceneMode] = useState<'exploring' | 'village'>('village');
  const sceneModeRef = useRef(sceneMode);
  useEffect(() => {
    sceneModeRef.current = sceneMode;
  }, [sceneMode]);
  const [sceneTransition, setSceneTransition] = useState<string | null>(null);
  const sceneTransitionTimerRef = useRef<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [celebrationClaimed, setCelebrationClaimed] = useState<AfkPendingReward | null>(null);
  /** XP/level-up ficam represados até o jogador fechar a celebração do baú —
      disparar na hora do claim fazia as bolinhas de XP voarem (e o level up
      tomar a tela) por baixo do modal de recompensas, sem o jogador nunca ver. */
  const pendingXpEffectsRef = useRef<{ xp: number; levelUp: LevelUpCelebration | null } | null>(
    null,
  );
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

  // Badge da mochila mostra só os itens NOVOS desde a última vez que o
  // jogador abriu o inventário (não o total) — evita o número "grudado"
  // sempre alto depois que o inventário já foi checado uma vez.
  const [inventorySeenCount, setInventorySeenCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem(`abdoria_inventory_seen_${userId}`);
    return stored ? Number(stored) || 0 : 0;
  });

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
      // AFK de verdade: a cena que a tela abre é a que o servidor diz que
      // está rolando (pausado = vila, senão = explorando), não sempre vila —
      // senão fechar a tela enquanto explorava jogava o jogador de volta pra
      // vila ao reabrir, quebrando a premissa de "progride mesmo fora da tela".
      if (isInitialLoad) setSceneMode(data.paused ? 'village' : 'exploring');
      hasLoadedRef.current = true;
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar a exploração.'), {
        variant: 'error',
      });
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [reconcileTimerFromServer]);

  /** Troca de cena com uma transição breve — evita o corte seco entre a
      vila e a floresta e dá um respiro de "carregando" estilo jogo. */
  const goToScene = useCallback(
    (mode: 'exploring' | 'village') => {
      if (mode === sceneMode) return;
      const label = mode === 'exploring' ? 'Entrando na Floresta...' : 'Voltando para a vila...';
      setSceneTransition(label);
      if (sceneTransitionTimerRef.current) window.clearTimeout(sceneTransitionTimerRef.current);
      sceneTransitionTimerRef.current = window.setTimeout(() => {
        setSceneMode(mode);
        sceneTransitionTimerRef.current = window.setTimeout(() => {
          setSceneTransition(null);
        }, 300);
      }, 1620);
    },
    [sceneMode],
  );

  useEffect(
    () => () => {
      if (sceneTransitionTimerRef.current) window.clearTimeout(sceneTransitionTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      syncedMinutosRef.current = null;
      hasLoadedRef.current = false;
      // Rearma o gate de loading pra próxima abertura — sem isso, reabrir a
      // tela (se o componente ficar montado entre fechamentos) já nasceria
      // com loading=false do ciclo anterior e voltaria a piscar a vila.
      setLoading(true);
      setShopOpen(false);
      setBestiaryOpen(false);
      setInventoryOpen(false);
      setCelebrationClaimed(null);
      // Fechar a tela parado na vila manda o personagem explorar sozinho —
      // é assim que AFK funciona, progresso não pode ficar pausado só porque
      // o jogador não está olhando. Não força mais 'village' aqui: a próxima
      // abertura decide a cena a partir do que o servidor diz (load()/
      // data.paused), então isso também corrige o reabrir sempre na vila.
      if (sceneModeRef.current === 'village') {
        void setAfkScene('exploring').catch(() => {
          /* melhor esforço — o próximo open recarrega e corrige */
        });
      }
      if (sceneTransitionTimerRef.current) {
        window.clearTimeout(sceneTransitionTimerRef.current);
        sceneTransitionTimerRef.current = null;
      }
      setSceneTransition(null);
      return;
    }
    if (
      user?.preferencias?.personagem_genero &&
      !window.localStorage.getItem(EXPLORATION_TUTORIAL_KEY)
    ) {
      setShowTutorial(true);
    }
    void load();
  }, [open, load, user?.preferencias?.personagem_genero]);

  useEffect(() => {
    if (!open) return undefined;

    const combatPoll = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => window.clearInterval(combatPoll);
  }, [open, load]);

  // Vila pausa o tempo acumulado da Exploração no servidor; floresta
  // retoma — dispara em toda troca de cena, inclusive a inicial (a página
  // abre na vila por padrão, então o timer já nasce pausado).
  useEffect(() => {
    if (!open) return;
    setAfkScene(sceneMode)
      .then((res) => {
        setMeta((prev) => ({
          ...(prev ?? ({} as AfkMetaResponse)),
          minutos_acumulados: res.minutos_acumulados,
          pending: res.pending,
          has_rewards: res.has_rewards,
          kill_drop_chance: res.kill_drop_chance ?? prev?.kill_drop_chance ?? 4,
          kill_drop_chances: res.kill_drop_chances ?? prev?.kill_drop_chances,
          max_minutes: res.max_minutes ?? prev?.max_minutes ?? 1440,
          capped: res.capped ?? prev?.capped ?? false,
          combat: mergeAfkCombatSnapshot(prev?.combat, res.combat),
        }));
        reconcileTimerFromServer(res.minutos_acumulados);
      })
      .catch(() => {
        /* melhor esforço — o próximo poll de 15s corrige o estado */
      });
  }, [open, sceneMode, reconcileTimerFromServer]);

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

  // Na vila o tempo acumulado fica pausado no servidor (setAfkScene já cuida
  // disso); o relógio visual local também não pode continuar correndo aqui,
  // senão o número sobe na tela mesmo com o acúmulo travado no backend.
  useEffect(() => {
    if (!open || meta?.capped || sceneMode === 'village') return undefined;
    const timer = window.setInterval(() => {
      setElapsedSinceSyncMin((Date.now() - loadedAtRef.current) / 60_000);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, meta?.capped, sceneMode]);

  const handleTutorialClose = useCallback(() => {
    window.localStorage.setItem(EXPLORATION_TUTORIAL_KEY, '1');
    setShowTutorial(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Precisa vir antes do onClose geral: o tutorial cobre a tela por
      // cima (z-index), mas isso não bloqueia esse listener de teclado — sem
      // essa checagem, Esc fechava a Exploração inteira por baixo do
      // tutorial sem passar por handleTutorialClose, que é o único lugar que
      // grava "já visto" no localStorage. Resultado: o tutorial nunca era
      // marcado como visto e voltava a aparecer na próxima entrada.
      if (showTutorial) {
        handleTutorialClose();
        return;
      }
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
  }, [open, onClose, shopOpen, inventoryOpen, showTutorial, handleTutorialClose]);

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

    const pending = pendingXpEffectsRef.current;
    if (pending) {
      pendingXpEffectsRef.current = null;
      emitXpEarned(pending.xp);
      if (pending.levelUp) {
        window.dispatchEvent(new CustomEvent('abdoria:level-up', { detail: pending.levelUp }));
      }
    }
  }, [presentRewards]);

  const handleClaim = async () => {
    if (!meta?.has_rewards) return;
    setClaiming(true);
    try {
      const res = await claimAfkRewards();
      // A celebração só precisa do que `claimAfkRewards` já devolveu — mostra
      // na hora em vez de esperar mais duas chamadas (refresh geral + reload
      // do meta AFK) que só servem pra sincronizar estado em segundo plano.
      applyUser(res.user);
      pendingXpEffectsRef.current = { xp: res.claimed.xp, levelUp: res.level_up ?? null };
      showClaimedCelebration(res.claimed, res.overflow_to_dorias);
      void refreshApp();
      void load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível coletar recompensas.'), {
        variant: 'error',
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  const needsCharacterSetup = !user?.preferencias?.personagem_genero;
  const genero: PersonagemGenero = user?.preferencias?.personagem_genero ?? 'masculino';
  const capped = meta?.capped ?? false;
  const inventoryItemCount =
    (stats?.frozen_streak_count ?? 0) +
    (stats?.route_drink_count ?? meta?.route_drink_count ?? 0) +
    (stats?.exp_instant_count ?? 0) +
    (stats?.doria_bag_count ?? 0);
  const newInventoryItemCount = Math.max(0, inventoryItemCount - inventorySeenCount);

  const handleInventoryOpen = () => {
    setInventoryOpen(true);
    setInventorySeenCount(inventoryItemCount);
    window.localStorage.setItem(`abdoria_inventory_seen_${userId}`, String(inventoryItemCount));
  };

  const handleInventoryClose = () => {
    setInventoryOpen(false);
    void load();
  };

  const content = (
    <>
      <div
        className={`game-afk-overlay${isPage ? ' game-afk-overlay--page' : ''}`}
        role={isPage ? undefined : 'dialog'}
        aria-modal={isPage ? undefined : true}
        aria-labelledby="afk-patrol-title"
        onClick={isPage ? undefined : onClose}
      >
        <motion.div
          className={`game-afk-modal${isPage ? ' game-afk-modal--page' : ''}`}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          {needsCharacterSetup ? (
            <>
              <div className="game-afk-modal__topbar game-afk-modal__topbar--setup">
                <h2 id="afk-patrol-title" className="game-afk-modal__title">
                  Exploração
                </h2>
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
              <ExplorationIntroFlow onDone={() => void load()} />
            </>
          ) : (
            <>
              <div className="game-afk-modal__topbar game-afk-modal__topbar--main">
            <div className="game-afk-modal__topbar-side game-afk-modal__topbar-side--start">
              {!loading && sceneMode === 'exploring' && (
                <button
                  type="button"
                  className="game-afk-modal__shop-btn game-afk-modal__shop-btn--icon game-afk-modal__shop-btn--village"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToScene('village');
                  }}
                  title="Voltar à vila"
                  aria-label="Voltar à vila"
                >
                  <TreePine size={22} aria-hidden />
                  <span className="game-afk-modal__shop-btn-hint" aria-hidden>
                    Voltar para a Vila
                  </span>
                </button>
              )}
              {!loading && sceneMode === 'village' && (
                <button
                  type="button"
                  className="game-afk-modal__shop-btn game-afk-modal__shop-btn--icon game-afk-modal__shop-btn--inventory"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInventoryOpen();
                  }}
                  title="Inventário"
                  aria-label={
                    newInventoryItemCount > 0
                      ? `Abrir inventário, ${newInventoryItemCount} itens novos`
                      : 'Abrir inventário'
                  }
                >
                  <Backpack size={26} aria-hidden />
                  <span className="game-afk-modal__shop-btn-hint" aria-hidden>
                    Mochila
                  </span>
                  {newInventoryItemCount > 0 && (
                    <span className="game-afk-modal__inventory-badge tabular-nums">
                      {newInventoryItemCount}
                    </span>
                  )}
                </button>
              )}
            </div>
            <h2 id="afk-patrol-title" className="game-afk-modal__title">
              {loading ? 'Exploração' : sceneMode === 'village' ? 'Vila Abdoria' : 'Exploração'}
            </h2>
            <div className="game-afk-modal__toolbar">
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

          {loading ? (
            <div className="game-afk-scene">
              <div className="game-afk-scene__viewport game-afk-scene__viewport--loading">
                <span className="game-afk-scene__loading-spinner" aria-hidden />
                <p className="game-afk-scene__loading-text">Carregando exploração...</p>
              </div>
            </div>
          ) : sceneMode === 'village' ? (
            <AfkVillageScene
              bestiaryUnlocked={stats?.bestiario_desbloqueados?.length ?? 0}
              bestiaryTotal={ALL_BESTIARY_ENEMY_IDS.length}
              onOpenShop={() => setShopOpen(true)}
              onOpenBestiary={() => setBestiaryOpen(true)}
              onContinue={() => goToScene('exploring')}
            />
          ) : (
            <AfkCombatScene
              userId={userId}
              weapon={weapon}
              weaponId={weaponId}
              genero={genero}
              combat={meta?.combat ?? null}
              hasLoot={meta?.has_rewards}
              capped={capped}
              onBackToVillage={() => goToScene('village')}
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
            </>
          )}
        </motion.div>
      </div>

      {sceneTransition && <SceneTransitionOverlay label={sceneTransition} />}

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
        open={showTutorial && !needsCharacterSetup}
        onClose={handleTutorialClose}
        slides={EXPLORATION_TUTORIAL_SLIDES}
        ctaLabel="Vamos explorar!"
      />
    </>
  );

  // Variante 'page' renderiza direto na árvore (dentro de #root) — o portal
  // pro <body> deixava o conteúdo real depois do #root (que tem
  // min-height:100vh no CSS global), empurrando a Exploração inteira pra
  // baixo da dobra e exigindo scroll só pra ver a página.
  return isPage ? content : createPortal(content, document.body);
}
