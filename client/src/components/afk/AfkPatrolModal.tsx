import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Backpack, ChevronLeft, Sparkles } from 'lucide-react';
import { BestiaryModal } from '@/components/bestiary/BestiaryModal';
import { AfkCombatScene } from '@/components/afk/AfkCombatScene';
import { AfkGameLoading } from '@/components/afk/AfkGameLoading';
import { AfkVillageScene } from '@/components/afk/AfkVillageScene';
import { AfkDialogueModal, type AfkDialogueLine } from '@/components/afk/AfkDialogueModal';
import { AfkRegionMapModal } from '@/components/afk/AfkRegionMapModal';
import { AfkRegionTravelOverlay } from '@/components/afk/AfkRegionTravelOverlay';
import { AfkSkillTreeModal } from '@/components/afk/AfkSkillTreeModal';
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
import {
  claimAfkRewards,
  advanceAfkChapter,
  getAfkMeta,
  markAfkStory,
  recordAfkEnemyDefeat,
  recordAfkEnemyHp,
  resetAfkSkillTree,
  selectAfkRegion,
  setAfkAway,
  setAfkScene,
  startAfkAdventure,
  type AfkMetaResponse,
  type AfkPingResponse,
  unlockAfkSkill,
} from '@/lib/api';
import { DEV_REWARD_PREVIEW_EVENT } from '@/lib/dev-reward-preview';
import { discardedItemsToastMessage } from '@/lib/inventory-discard';
import { mergeAfkCombatSnapshot } from '@/lib/afk-combat-merge';
import { preloadAfkImage, preloadVillageImages } from '@/lib/afk-image-preload';
import { emitXpEarned } from '@/lib/xp-orbs';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import type {
  AfkPendingReward,
  AfkRegionId,
  AfkRegionDefinition,
  ArmaPreferida,
  LevelUpCelebration,
  PersonagemGenero,
} from '@/types';
import {
  ALL_BESTIARY_ENEMY_IDS,
  AFK_ENEMIES,
  getAfkRegionById,
  getNextAfkRegion,
  resolvePatrolArmas,
} from '@/types';

interface ActiveDialogue {
  title: string;
  lines: readonly AfkDialogueLine[];
  onComplete?: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 'page' renderiza como tela cheia (rota /exploracao), sem overlay de
      diálogo — usado pela ExplorationPage. Padrão: modal flutuante. */
  variant?: 'modal' | 'page';
}

const REGION_TRAVEL_MIN_DURATION_MS = 900;

async function prepareRegionTravel(region: AfkRegionDefinition): Promise<void> {
  await Promise.all([
    preloadAfkImage(region.backgroundUrl),
    new Promise<void>((resolve) => window.setTimeout(resolve, REGION_TRAVEL_MIN_DURATION_MS)),
  ]);
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
  const [mapOpen, setMapOpen] = useState(false);
  const [travelingRegionId, setTravelingRegionId] = useState<AfkRegionId | null>(null);
  const [skillTreeOpen, setSkillTreeOpen] = useState(false);
  const [adventureBusy, setAdventureBusy] = useState(false);
  const adventureBusyRef = useRef(false);
  const regionChangeVersionRef = useRef(0);
  const [dialogue, setDialogue] = useState<ActiveDialogue | null>(null);
  const [pendingDialogue, setPendingDialogue] = useState<ActiveDialogue | null>(null);
  const [regionReady, setRegionReady] = useState(false);
  const [bossActive, setBossActive] = useState(false);
  const [orbDropSeq, setOrbDropSeq] = useState(0);
  const queuedStoryFlagsRef = useRef(new Set<string>());
  const combatOrbsRef = useRef(0);
  /** Hub entre patrulhas: a vila (loja + bestiário) x a cena de combate ao vivo.
      Personagem novo começa na vila até clicar em "Explorar"; depois disso a
      cena de abertura vem do servidor (ver load()/data.paused) — fechar a
      tela explorando reabre explorando, fechar na vila manda explorar sozinho. */
  const [sceneMode, setSceneMode] = useState<'exploring' | 'village'>('village');
  const [activeRegion, setActiveRegion] = useState<AfkRegionDefinition | null>(null);
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
  // Todas as escritas do encontro passam pela mesma fila para uma requisição
  // de HP atrasada nunca sobrescrever a vitória/respawn seguinte.
  const combatWriteQueueRef = useRef<Promise<unknown>>(Promise.resolve());

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
  const genero: PersonagemGenero = user?.preferencias?.personagem_genero ?? 'masculino';

  useEffect(() => {
    combatOrbsRef.current = meta?.combat.orbs ?? 0;
  }, [meta?.combat.orbs]);

  const applyAfkResponse = useCallback(
    (data: AfkMetaResponse | AfkPingResponse, replaceCombat = false) => {
      setMeta((prev) => ({
        ...(prev ?? (data as AfkMetaResponse)),
        ...data,
        arma_preferida:
          prev?.arma_preferida ?? ('arma_preferida' in data ? data.arma_preferida : 'arco'),
        combat: replaceCombat ? data.combat : mergeAfkCombatSnapshot(prev?.combat, data.combat),
      }));
      reconcileTimerFromServer(data.minutos_acumulados);
    },
    [reconcileTimerFromServer],
  );

  const handleExit = useCallback(() => {
    void combatWriteQueueRef.current.finally(() => setAfkAway());
    onClose();
  }, [onClose]);

  // Badge da mochila mostra só os itens NOVOS desde a última vez que o
  // jogador abriu o inventário (não o total) — evita o número "grudado"
  // sempre alto depois que o inventário já foi checado uma vez.
  const [inventorySeenCount, setInventorySeenCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem(`abdoria_inventory_seen_${userId}`);
    return stored ? Number(stored) || 0 : 0;
  });

  const load = useCallback(async () => {
    if (adventureBusyRef.current) return;
    const regionVersion = regionChangeVersionRef.current;
    // Só a 1ª carga mostra o estado de loading (timer "--:--:--", botão desabilitado).
    // Refreshes em segundo plano (poll de 15s, claim, troca de arma, fechar
    // inventário) atualizam o meta silenciosamente — sem isso, a UI piscava
    // "carregando" e desabilitava o Coletar a cada sync, parecendo bugado.
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setLoading(true);
    try {
      const startedAt = Date.now();
      await combatWriteQueueRef.current.catch(() => undefined);
      const data = await getAfkMeta();
      if (regionVersion !== regionChangeVersionRef.current) return;
      if (isInitialLoad) {
        const region = getAfkRegionById(data.combat?.region_id);
        const minimumLoadingMs = 850;
        await Promise.all([
          data.paused ? preloadVillageImages() : preloadAfkImage(region.backgroundUrl),
          new Promise<void>((resolve) =>
            window.setTimeout(resolve, Math.max(0, minimumLoadingMs - (Date.now() - startedAt))),
          ),
        ]);
      }
      applyAfkResponse(data, isInitialLoad);
      setActiveRegion(getAfkRegionById(data.combat.region_id));
      setRegionReady(true);
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
  }, [applyAfkResponse]);

  /** Troca de cena com uma transição breve — evita o corte seco entre a
      vila e a floresta e dá um respiro de "carregando" estilo jogo. */
  const goToScene = useCallback(
    (mode: 'exploring' | 'village') => {
      if (mode === sceneMode) return;
      const label =
        mode === 'exploring' ? 'Retomando a jornada...' : 'Retornando à Vila Abdoria...';
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
      setMapOpen(false);
      setSkillTreeOpen(false);
      setDialogue(null);
      setPendingDialogue(null);
      setRegionReady(false);
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
    if (!open) return undefined;
    const restoreVisibleScene = () => {
      if (document.visibilityState !== 'visible') return;
      window.setTimeout(() => void setAfkScene(sceneModeRef.current), 60);
    };
    document.addEventListener('visibilitychange', restoreVisibleScene);
    return () => document.removeEventListener('visibilitychange', restoreVisibleScene);
  }, [open]);

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

  const showClaimedCelebration = useCallback((claimed: AfkPendingReward, discardedItems = 0) => {
    setCelebrationClaimed(claimed);
    const discardedMessage = discardedItemsToastMessage(discardedItems);
    if (discardedMessage) showGameToast(discardedMessage, { variant: 'info' });
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
    if (
      !open ||
      loading ||
      showTutorial ||
      dialogue ||
      sceneMode !== 'village' ||
      !meta?.combat ||
      meta.combat.intro_seen ||
      queuedStoryFlagsRef.current.has('village_intro')
    )
      return;
    queuedStoryFlagsRef.current.add('village_intro');
    setDialogue({
      title: 'O chamado de Abdoria',
      lines: [
        {
          speaker: 'Ancião Odrin',
          tone: 'elder',
          text: 'As rotas de Abdoria despertaram. Algo inquieta os slimes além dos portões.',
        },
        {
          speaker: 'Herói',
          tone: 'hero',
          text: 'Então começarei pela Trilha Verdejante. Voltarei com respostas.',
        },
        {
          speaker: 'Ancião Odrin',
          tone: 'elder',
          text: 'Observe, aprenda e fique mais forte. A árvore da vila responderá às orbes dos guardiões.',
        },
      ],
      onComplete: () => {
        void markAfkStory('village_intro');
        setMeta((current) =>
          current ? { ...current, combat: { ...current.combat, intro_seen: true } } : current,
        );
      },
    });
  }, [dialogue, loading, meta?.combat, open, sceneMode, showTutorial]);

  useEffect(() => {
    if (
      !pendingDialogue ||
      dialogue ||
      !regionReady ||
      sceneTransition ||
      sceneMode !== 'exploring'
    )
      return;
    setDialogue(pendingDialogue);
    setPendingDialogue(null);
  }, [dialogue, pendingDialogue, regionReady, sceneMode, sceneTransition]);

  useEffect(() => {
    if (
      !bossActive ||
      dialogue ||
      !meta?.combat ||
      sceneMode !== 'exploring' ||
      !regionReady ||
      sceneTransition ||
      mapOpen
    )
      return;
    const region = getAfkRegionById(meta.combat.region_id);
    const translated = meta.combat.slime_language_unlocked;
    const flag = translated ? `boss_translated_${region.id}` : `boss_intro_${region.id}`;
    if (meta.combat.story_flags.includes(flag) || queuedStoryFlagsRef.current.has(flag)) return;
    queuedStoryFlagsRef.current.add(flag);
    setDialogue({
      title: `Guardião de ${region.name}`,
      lines: translated
        ? [
            {
              speaker: AFK_ENEMIES[region.bossId].label,
              tone: 'slime',
              portrait: { kind: 'boss', enemyId: region.bossId },
              text: 'Finalmente você consegue nos compreender. Nós protegíamos estas terras do sono que se espalha.',
            },
            {
              speaker: 'Herói',
              tone: 'hero',
              portrait: { kind: 'hero', gender: genero },
              text: 'Então eu ouvi ameaças onde havia um aviso. Ainda assim, preciso provar minha força.',
            },
          ]
        : [
            {
              speaker: AFK_ENEMIES[region.bossId].label,
              tone: 'slime',
              portrait: { kind: 'boss', enemyId: region.bossId },
              text: 'Glub… mori fla blu, abdô-ria gruum!',
            },
            {
              speaker: 'Herói',
              tone: 'hero',
              portrait: { kind: 'hero', gender: genero },
              text: 'Eu não entendi uma palavra. Mas parece que você quer lutar.',
            },
          ],
      onComplete: () => {
        void markAfkStory(flag);
        setMeta((current) =>
          current
            ? {
                ...current,
                combat: {
                  ...current.combat,
                  story_flags: [...new Set([...current.combat.story_flags, flag])],
                },
              }
            : current,
        );
      },
    });
  }, [bossActive, dialogue, genero, meta?.combat, regionReady, sceneMode, sceneTransition, mapOpen]);

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
      if (mapOpen) {
        setMapOpen(false);
        return;
      }
      if (skillTreeOpen) {
        setSkillTreeOpen(false);
        return;
      }
      if (dialogue) {
        setDialogue(null);
        return;
      }
      handleExit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    open,
    handleExit,
    shopOpen,
    inventoryOpen,
    mapOpen,
    skillTreeOpen,
    dialogue,
    showTutorial,
    handleTutorialClose,
  ]);

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
      showClaimedCelebration(res.claimed, res.discarded_items);
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

  const needsCharacterSetup = !user?.preferencias?.personagem_genero;
  const capped = meta?.capped ?? false;
  const displayedRegion = activeRegion ?? getAfkRegionById(meta?.combat?.region_id);
  const displayedProgress = meta?.combat?.region_progress?.[displayedRegion.id];
  const nextRegion = getNextAfkRegion(displayedRegion.id);
  const canAdvanceChapter = Boolean(
    displayedProgress?.boss_defeated &&
    nextRegion &&
    !meta?.combat?.unlocked_regions.includes(nextRegion.id),
  );
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

  const handleStartAdventure = async () => {
    if (adventureBusy) return;
    if (meta?.combat.adventure_started) {
      const region = getAfkRegionById(meta.combat.region_id);
      setRegionReady(false);
      await preloadAfkImage(region.backgroundUrl);
      setActiveRegion(region);
      setRegionReady(true);
      goToScene('exploring');
      return;
    }
    setAdventureBusy(true);
    adventureBusyRef.current = true;
    regionChangeVersionRef.current += 1;
    try {
      setRegionReady(false);
      const response = await startAfkAdventure();
      applyAfkResponse(response);
      const region = getAfkRegionById(response.combat.region_id);
      setActiveRegion(region);
      await preloadAfkImage(region.backgroundUrl);
      setRegionReady(true);
      const flag = `boss_intro_${region.id}`;
      queuedStoryFlagsRef.current.add(flag);
      setPendingDialogue({
        title: `Além dos portões · ${region.name}`,
        lines: [
          {
            speaker: AFK_ENEMIES[region.bossId].label,
            tone: 'slime',
            text: 'Glub blor… fraa Abdoria, mori glim!',
          },
          {
            speaker: 'Herói',
            tone: 'hero',
            text: 'Eu realmente não faço ideia do que você está dizendo.',
          },
          { speaker: AFK_ENEMIES[region.bossId].label, tone: 'slime', text: 'Gruum!' },
          { speaker: 'Herói', tone: 'hero', text: 'Certo. Então resolvemos isso na batalha.' },
        ],
        onComplete: () => {
          void markAfkStory(flag);
          setMeta((current) =>
            current
              ? {
                  ...current,
                  combat: {
                    ...current.combat,
                    story_flags: [...new Set([...current.combat.story_flags, flag])],
                  },
                }
              : current,
          );
        },
      });
      goToScene('exploring');
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível começar a aventura.'), {
        variant: 'error',
      });
    } finally {
      adventureBusyRef.current = false;
      setAdventureBusy(false);
    }
  };

  const handleEnemyDefeated = useCallback(
    (expectedKillsTotal: number, wasBoss: boolean) => {
      const request = combatWriteQueueRef.current.then(() =>
        recordAfkEnemyDefeat(expectedKillsTotal),
      );
      combatWriteQueueRef.current = request;
      void request
        .then((response) => {
          applyAfkResponse(response);
          if (wasBoss && response.combat.orbs > combatOrbsRef.current) {
            setOrbDropSeq((value) => value + 1);
            showGameToast('Orbe ancestral obtida! Visite a árvore da vila.', {
              variant: 'success',
            });
          }
          const defeatedRegion = getAfkRegionById(response.combat.region_id);
          const victoryFlag = `boss_victory_${defeatedRegion.id}`;
          if (wasBoss && !response.combat.story_flags.includes(victoryFlag)) {
            const understandsSlimes = response.combat.slime_language_unlocked;
            setDialogue({
              title: `Vitória em ${defeatedRegion.name}`,
              lines: [
                {
                  speaker: AFK_ENEMIES[defeatedRegion.bossId].label,
                  tone: 'slime',
                  portrait: { kind: 'boss', enemyId: defeatedRegion.bossId },
                  text: understandsSlimes
                    ? defeatedRegion.chapter === 6
                      ? 'Agora você nos escuta. Volte aos antigos guardiões; eles também têm algo a dizer.'
                      : 'Você venceu. A rota adiante é perigosa, mas sua coragem é verdadeira.'
                    : 'Glub... fra lum, abdô-ria nohm... glub.',
                },
                {
                  speaker: 'Herói',
                  tone: 'hero',
                  portrait: { kind: 'hero', gender: genero },
                  text: understandsSlimes
                    ? 'Agora compreendo. Esta batalha não foi em vão.'
                    : 'Ainda não entendo sua língua, mas reconheço sua honra. Seguiremos em frente.',
                },
              ],
              onComplete: () => {
                void markAfkStory(victoryFlag);
                if (defeatedRegion.chapter === 6) void markAfkStory('chapter_6_reveal');
              },
            });
          }
        })
        .catch(() => void load());
    },
    [applyAfkResponse, genero, load],
  );

  const handleEnemyDamaged = useCallback(
    (expectedKillsTotal: number, enemyId: Parameters<typeof recordAfkEnemyHp>[1], enemyHp: number) => {
      const request = combatWriteQueueRef.current.then(() =>
        recordAfkEnemyHp(expectedKillsTotal, enemyId, enemyHp),
      );
      combatWriteQueueRef.current = request.catch(() => undefined);
    },
    [],
  );

  const handleSelectRegion = async (regionId: AfkRegionId) => {
    if (meta?.combat.region_id === regionId) {
      showGameToast(`Você já está explorando ${getAfkRegionById(regionId).name}.`, {
        variant: 'info',
      });
      return;
    }
    setAdventureBusy(true);
    adventureBusyRef.current = true;
    regionChangeVersionRef.current += 1;
    setTravelingRegionId(regionId);
    setRegionReady(false);
    setMapOpen(false);
    const requestedRegion = getAfkRegionById(regionId);
    try {
      await combatWriteQueueRef.current.catch(() => undefined);
      const [response] = await Promise.all([
        selectAfkRegion(regionId),
        prepareRegionTravel(requestedRegion),
      ]);
      if (response.combat.region_id !== regionId) {
        throw new Error('O servidor não confirmou o novo capítulo. Tente viajar novamente.');
      }
      applyAfkResponse(response);
      setActiveRegion(requestedRegion);
      setRegionReady(true);
      showGameToast(`Viagem concluída: agora explorando ${requestedRegion.name}.`, {
        variant: 'success',
      });
    } catch (error) {
      setMapOpen(true);
      showGameToast(getErrorMessage(error, 'Não foi possível viajar para esta região.'), {
        variant: 'error',
      });
    } finally {
      setRegionReady(true);
      setTravelingRegionId(null);
      adventureBusyRef.current = false;
      setAdventureBusy(false);
    }
  };

  const handleAdvanceChapter = async () => {
    if (!nextRegion) return;
    setAdventureBusy(true);
    adventureBusyRef.current = true;
    regionChangeVersionRef.current += 1;
    setRegionReady(false);
    setTravelingRegionId(nextRegion.id);
    try {
      await combatWriteQueueRef.current.catch(() => undefined);
      const [response] = await Promise.all([advanceAfkChapter(), prepareRegionTravel(nextRegion)]);
      if (response.region_id !== nextRegion.id || response.combat.region_id !== nextRegion.id) {
        throw new Error('O servidor não confirmou o avanço de capítulo. Tente novamente.');
      }
      applyAfkResponse(response);
      setActiveRegion(nextRegion);
      setRegionReady(true);
      setDialogue({
        title: response.story.title,
        lines: [
          { speaker: 'Crônica de Abdoria', tone: 'story', text: response.story.body },
          {
            speaker: 'Herói',
            tone: 'hero',
            text: `O caminho para ${nextRegion.name} está aberto.`,
          },
        ],
        onComplete: () => setMapOpen(true),
      });
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível avançar o capítulo.'), {
        variant: 'error',
      });
    } finally {
      setRegionReady(true);
      setTravelingRegionId(null);
      adventureBusyRef.current = false;
      setAdventureBusy(false);
    }
  };

  const handleUnlockSkill = async (nodeId: string) => {
    setAdventureBusy(true);
    try {
      const response = await unlockAfkSkill(nodeId);
      applyAfkResponse(response);
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível desbloquear a habilidade.'), {
        variant: 'error',
      });
    } finally {
      setAdventureBusy(false);
    }
  };

  const handleResetSkills = async (currency: 'coins' | 'gems') => {
    setAdventureBusy(true);
    try {
      const response = await resetAfkSkillTree(currency);
      applyUser(response.user);
      applyAfkResponse(response);
      showGameToast(
        response.payment === 'free'
          ? 'Primeiro reset gratuito concluído. Seus orbes foram devolvidos.'
          : 'Árvore restaurada. Seus orbes foram devolvidos.',
        { variant: 'success' },
      );
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível resetar a árvore.'), {
        variant: 'error',
      });
    } finally {
      setAdventureBusy(false);
    }
  };

  if (!open) return null;

  const content = (
    <>
      <div
        className={`game-afk-overlay${isPage ? ' game-afk-overlay--page' : ''}`}
        role={isPage ? undefined : 'dialog'}
        aria-modal={isPage ? undefined : true}
        aria-labelledby="afk-patrol-title"
        onClick={isPage ? undefined : handleExit}
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
                <button
                  type="button"
                  className="game-afk-modal__exit-btn"
                  onClick={handleExit}
                  aria-label="Sair da exploração"
                >
                  <ChevronLeft size={18} aria-hidden />
                  <span>Sair</span>
                </button>
                <div className="game-afk-modal__title-lockup">
                  <span className="game-afk-modal__chapter">NOVA JORNADA</span>
                  <h2 id="afk-patrol-title" className="game-afk-modal__title">
                    Exploração
                  </h2>
                </div>
                <span className="game-afk-modal__topbar-spacer" aria-hidden />
              </div>
              <ExplorationIntroFlow onDone={() => void load()} />
            </>
          ) : (
            <>
              <div className="game-afk-modal__topbar game-afk-modal__topbar--main">
                <button
                  type="button"
                  className="game-afk-modal__exit-btn"
                  onClick={handleExit}
                  aria-label="Sair da exploração"
                >
                  <ChevronLeft size={18} aria-hidden />
                  <span>Sair</span>
                </button>
                <div className="game-afk-modal__title-lockup">
                  <span className="game-afk-modal__chapter">
                    {sceneMode === 'village'
                      ? 'PONTO DE DESCANSO'
                      : `CAPÍTULO ${String(displayedRegion.chapter).padStart(2, '0')}`}
                  </span>
                  <h2 id="afk-patrol-title" className="game-afk-modal__title">
                    {sceneMode === 'village' ? 'Vila Abdoria' : displayedRegion.name}
                  </h2>
                </div>
                <div className="game-afk-modal__toolbar">
                  {!loading && (
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
              </div>

              {loading ? (
                <AfkGameLoading />
              ) : (
                <div className="game-afk-stage-layout">
                  <main className="game-afk-stage-layout__scene">
                    {sceneMode === 'village' ? (
                      <AfkVillageScene
                        bestiaryUnlocked={stats?.bestiario_desbloqueados?.length ?? 0}
                        bestiaryTotal={ALL_BESTIARY_ENEMY_IDS.length}
                        onOpenShop={() => setShopOpen(true)}
                        onOpenBestiary={() => setBestiaryOpen(true)}
                        onOpenSkillTree={() => setSkillTreeOpen(true)}
                        onContinue={() => void handleStartAdventure()}
                        adventureStarted={meta?.combat.adventure_started}
                        busy={adventureBusy}
                      />
                    ) : (
                      <AfkCombatScene
                        key={meta?.combat.region_id ?? 'loading-region'}
                        userId={userId}
                        weapon={weapon}
                        weaponId={weaponId}
                        genero={genero}
                        combat={meta?.combat ?? null}
                        hasLoot={meta?.has_rewards}
                        capped={capped}
                        onBossChange={setBossActive}
                        onRegionChange={setActiveRegion}
                        onOpenMap={() => setMapOpen(true)}
                        onEnemyDefeated={handleEnemyDefeated}
                        onEnemyDamaged={handleEnemyDamaged}
                        onBackToVillage={() => goToScene('village')}
                        paused={Boolean(
                          dialogue ||
                          pendingDialogue ||
                          mapOpen ||
                          skillTreeOpen ||
                          sceneTransition ||
                          !regionReady,
                        )}
                      />
                    )}
                  </main>

                  <aside className="game-afk-dock" aria-label="Progresso e recompensas da patrulha">
                    <div className="game-afk-dock__heading">
                      <span>Diário da patrulha</span>
                      <strong>{sceneMode === 'village' ? 'Pausado' : 'Explorando'}</strong>
                    </div>
                    <AfkTimerPanel
                      minutos={meta?.minutos_acumulados ?? 0}
                      elapsedSinceSyncMin={elapsedSinceSyncMin}
                      capped={capped}
                      loading={loading}
                      paused={sceneMode === 'village'}
                      dropChances={meta?.kill_drop_chances}
                    />

                    <div className="game-afk-dock__loot">
                      <AfkRewardGrid pending={meta?.pending} withChest />
                    </div>

                    <div className="game-afk-modal__footer">
                      {canAdvanceChapter && sceneMode === 'exploring' ? (
                        <GameButton
                          className="game-afk-next-chapter-btn"
                          size="lg"
                          disabled={adventureBusy}
                          onClick={() => void handleAdvanceChapter()}
                        >
                          Seguir para o próximo capítulo
                        </GameButton>
                      ) : null}
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
                        {claiming ? 'Coletando...' : 'Coletar recompensas'}
                      </GameButton>
                    </div>
                  </aside>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {sceneTransition && <SceneTransitionOverlay label={sceneTransition} />}

      {travelingRegionId ? (
        <AfkRegionTravelOverlay region={getAfkRegionById(travelingRegionId)} />
      ) : null}

      {orbDropSeq > 0 ? (
        <motion.div key={orbDropSeq} className="game-afk-orb-drop" aria-live="polite">
          <span>
            <Sparkles size={32} />
          </span>
          <strong>ORBE ANCESTRAL</strong>
          <small>+1 para a árvore de habilidades</small>
        </motion.div>
      ) : null}

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

      <AfkRegionMapModal
        open={mapOpen}
        combat={meta?.combat ?? null}
        busy={adventureBusy}
        travelingRegionId={travelingRegionId}
        onSelect={(regionId) => void handleSelectRegion(regionId)}
        onClose={() => setMapOpen(false)}
      />

      {skillTreeOpen ? (
        <AfkSkillTreeModal
          open
          combat={meta?.combat ?? null}
          busy={adventureBusy}
          onUnlock={(nodeId) => void handleUnlockSkill(nodeId)}
          onReset={(currency) => void handleResetSkills(currency)}
          onClose={() => setSkillTreeOpen(false)}
        />
      ) : null}

      <AfkDialogueModal
        open={Boolean(dialogue)}
        title={dialogue?.title ?? ''}
        lines={dialogue?.lines ?? []}
        onComplete={() => {
          const action = dialogue?.onComplete;
          setDialogue(null);
          action?.();
        }}
      />

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
