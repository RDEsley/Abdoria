import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bookmark, GraduationCap, LibraryBig, Podium } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { CreateSchemeModal } from '@/components/builder/CreateSchemeModal';
import { SaveWorkoutModal } from '@/components/builder/SaveWorkoutModal';
import { MAX_REP_SCHEMES, RepSchemeCarousel } from '@/components/builder/RepSchemeCarousel';
import { SimilarWorkoutModal } from '@/components/builder/SimilarWorkoutModal';
import { SimilarExerciseModal } from '@/components/builder/SimilarExerciseModal';
import { ExercisePicker } from '@/components/builder/ExercisePicker';
import { BuilderTabs, type BuilderTab } from '@/components/builder/BuilderTabs';
import { useStickyTab } from '@/hooks/useStickyTab';
import { BuilderStickyBar } from '@/components/builder/BuilderStickyBar';
import { BuilderSkeleton } from '@/components/builder/BuilderSkeleton';
import { DailyXpCapBanner } from '@/components/builder/DailyXpCapBanner';
import { ExerciseConfigModal } from '@/components/builder/ExerciseConfigModal';
import { TrainPresetSection } from '@/components/builder/TrainPresetSection';
import { WorkoutQueueList } from '@/components/builder/WorkoutQueueList';
import { AbTrainingProfileWizard } from '@/components/training/AbTrainingProfileWizard';
import { presetToQueue, sugeridoToQueue } from '@/components/builder/queue-utils';
import {
  filterSimilarPresets,
  filterSimilarSavedWorkouts,
  getMuscleProfileFromPreset,
  getMuscleProfileFromQueue,
  listSimilarWorkoutChoices,
} from '@/components/builder/similar-presets';
import { filterSimilarExercises, pickPresetForCycle } from '@/components/builder/similar-exercises';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { showGameToast } from '@/lib/game-toast';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getPresets, getRecommendWorkout, updateMe } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { resolveSelectedRepSchemeId } from '@/lib/user-dados';
import { estimateWorkoutDurationSeconds } from '@/lib/workout-duration';
import { createWorkoutSnapshot, webWorkoutSessionStorage } from '@/lib/workout-session-storage';
import { actionHaptic } from '@/lib/platform/native-runtime';
import type {
  ActiveWorkout,
  ModoExercicio,
  IWorkoutPresetDocument,
  NivelUsuario,
  Objetivo,
  RepSchemeRecommendation,
  SavedWorkoutPreset,
  StoredRepScheme,
  TreinoBase,
  TreinoSugerido,
  WorkoutQueueItem,
} from '@/types';
import {
  CICLO_LABELS,
  NIVEL_LABELS,
  formatExerciseName,
  fromSavedPresetId,
  getExerciseParamsForNivel,
  isSavedPresetId,
  normalizeCicloTreinos,
  REP_SCHEME_BY_NIVEL,
  toSavedPresetId,
} from '@/types';

const TREINO_TABS = ['train', 'customize'] as const;

export function TrainingPage() {
  const {
    exercises,
    customWorkout,
    customWorkoutName,
    savedWorkouts,
    stats,
    loadRecommendations,
    setCustomWorkout,
    setCustomWorkoutName,
    saveWorkoutPreset,
    getRepSchemes,
    setRepSchemeConfiguration,
    addRepScheme,
    removeRepScheme,
    selectedRepSchemeIds,
    setSelectedRepSchemeId,
    flushPendingUserDados,
    exercisesLoading,
    loading,
    ensureExercises,
    user,
  } = useApp();
  const { user: authUser, applyUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFromUrl = searchParams.get('preset');
  const modeFromUrl = searchParams.get('modo');

  const [activeTab, setActiveTab] = useStickyTab<BuilderTab>(
    'evolyn:treino-tab',
    TREINO_TABS,
    modeFromUrl === 'personalizar' ? 'customize' : 'train',
  );
  const [allPresets, setAllPresets] = useState<IWorkoutPresetDocument[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | 'custom'>('custom');
  const [draftQueue, setDraftQueue] = useState<WorkoutQueueItem[] | null>(null);
  const [configExerciseIndex, setConfigExerciseIndex] = useState<number | null>(null);
  const [showSimilarWorkout, setShowSimilarWorkout] = useState(false);
  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(null);
  const [globalDescanso, setGlobalDescanso] = useState<number>(
    authUser?.preferencias?.descanso_padrao_seg ?? 30,
  );
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [showCreateScheme, setShowCreateScheme] = useState(false);
  const [showSaveWorkout, setShowSaveWorkout] = useState(false);
  const [showAbPlan, setShowAbPlan] = useState(false);
  const [customizedIndices, setCustomizedIndices] = useState<Set<number>>(new Set());
  const [dismissedCardKey, setDismissedCardKey] = useState<string | null>(null);
  const lastAppliedQueueKeyRef = useRef('');
  const lastSyncedSuggestedRef = useRef<string | null>(null);
  const lastRestPreferenceRef = useRef(authUser?.preferencias?.descanso_padrao_seg ?? 30);

  useEffect(() => {
    const savedRest = authUser?.preferencias?.descanso_padrao_seg ?? 30;
    if (savedRest === lastRestPreferenceRef.current) return;
    lastRestPreferenceRef.current = savedRest;
    setGlobalDescanso(savedRest);
  }, [authUser?.preferencias?.descanso_padrao_seg]);

  const refreshRecommendations = useCallback(() => {
    void loadRecommendations({ force: true });
  }, [loadRecommendations]);

  const {
    fixedExerciseSlugs,
    blockedExerciseSlugs,
    fixedWorkoutIds,
    blockedWorkoutIds,
    toggleExercisePin,
    toggleExerciseBlock,
    toggleWorkoutPin,
    toggleWorkoutBlock,
  } = useUserPreferences(refreshRecommendations);

  const nivel: NivelUsuario = user?.nivel ?? authUser?.nivel ?? 'iniciante';
  const objetivo: Objetivo = user?.objetivo ?? authUser?.objetivo ?? 'definicao';
  const schemes = getRepSchemes(nivel);
  const persistedSchemeId = selectedRepSchemeIds[nivel];
  const cicloTreinos = normalizeCicloTreinos(
    user?.preferencias?.ciclo_treinos ?? authUser?.preferencias?.ciclo_treinos,
  );
  const cicloTreinosKey = cicloTreinos.join(',');
  const suggestedPresetId = stats?.treino_sugerido?.preset_id ?? null;
  const suggestedWorkout = stats?.treino_sugerido ?? null;
  const rodadaDone =
    user?.preferencias?.ciclos_completados_rodada ??
    authUser?.preferencias?.ciclos_completados_rodada ??
    {};

  // Modo plano (corpo todo): o sugerido vem do gerador, não de presets.
  const planoTreino = user?.plano_treino ?? authUser?.plano_treino ?? null;
  const [planOverride, setPlanOverride] = useState<TreinoSugerido | null>(null);
  const activePlanWorkout =
    planOverride ?? (suggestedWorkout?.plano_dia_indice != null ? suggestedWorkout : null);
  const isPlanSelected =
    typeof selectedPresetId === 'string' && selectedPresetId.startsWith('plano-dia-');
  const selectedPlanWorkout = isPlanSelected ? activePlanWorkout : null;

  const xpCapReached = useMemo(() => {
    if (!stats) return false;
    return stats.xp_hoje >= stats.xp_diario_limite;
  }, [stats]);

  useEffect(() => {
    void ensureExercises();
  }, [ensureExercises]);

  useEffect(() => {
    if (modeFromUrl === 'personalizar') handleTabChange('customize');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link aplicado somente quando o parâmetro muda
  }, [modeFromUrl]);

  useEffect(() => {
    void loadRecommendations({ force: true });
  }, [loadRecommendations]);

  useEffect(() => {
    return () => {
      void flushPendingUserDados();
    };
  }, [flushPendingUserDados]);

  useEffect(() => {
    setPresetsLoading(true);
    void getPresets()
      .then((list) => {
        setAllPresets(list);
        if (presetFromUrl && list.some((p) => p.id === presetFromUrl)) {
          setSelectedPresetId(presetFromUrl);
          setActiveTab('train');
        }
      })
      .catch(() => setAllPresets([]))
      .finally(() => setPresetsLoading(false));
  }, [presetFromUrl, cicloTreinosKey, nivel, user?.objetivo, setActiveTab]);

  useEffect(() => {
    if (presetFromUrl) return;
    const pinnedId = fixedWorkoutIds.find((id) => allPresets.some((p) => p.id === id));
    if (!pinnedId) return;
    if (selectedPresetId === pinnedId) return;
    lastSyncedSuggestedRef.current = pinnedId;
    setSelectedPresetId(pinnedId);
    setDraftQueue(null);
    setCustomizedIndices(new Set());
  }, [fixedWorkoutIds, allPresets, presetFromUrl, selectedPresetId]);

  useEffect(() => {
    if (presetFromUrl) return;
    if (fixedWorkoutIds.length > 0) return;
    if (!suggestedPresetId || !allPresets.some((p) => p.id === suggestedPresetId)) return;
    if (lastSyncedSuggestedRef.current === suggestedPresetId) return;
    lastSyncedSuggestedRef.current = suggestedPresetId;
    setSelectedPresetId(suggestedPresetId);
    setDraftQueue(null);
    setCustomizedIndices(new Set());
    setActiveTab('train');
  }, [suggestedPresetId, allPresets, presetFromUrl, fixedWorkoutIds.length, setActiveTab]);

  // Auto-seleção no modo plano — o preset_id do plano não existe em allPresets.
  useEffect(() => {
    if (!activePlanWorkout) return;
    if (presetFromUrl && !presetFromUrl.startsWith('plano-dia-')) return;
    if (lastSyncedSuggestedRef.current === activePlanWorkout.preset_id) return;
    lastSyncedSuggestedRef.current = activePlanWorkout.preset_id;
    setSelectedPresetId(activePlanWorkout.preset_id);
    setDraftQueue(null);
    setCustomizedIndices(new Set());
    setActiveTab('train');
  }, [activePlanWorkout, presetFromUrl, setActiveTab]);

  useEffect(() => {
    setSelectedSchemeId(resolveSelectedRepSchemeId(persistedSchemeId, schemes));
  }, [nivel, persistedSchemeId, schemes]);

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.slug, e])), [exercises]);

  const selectedPreset = allPresets.find((p) => p.id === selectedPresetId);
  const selectedSavedWorkout = isSavedPresetId(selectedPresetId)
    ? savedWorkouts.find((entry) => entry.id === fromSavedPresetId(selectedPresetId))
    : undefined;

  const scrollToSection = useCallback((id: string, delay = 0) => {
    const run = () =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (delay > 0) window.setTimeout(run, delay);
    else window.requestAnimationFrame(run);
  }, []);

  const baseQueue = useMemo(() => {
    const raw = (() => {
      if (selectedPresetId === 'custom') return customWorkout;
      if (selectedSavedWorkout) return selectedSavedWorkout.queue;
      if (selectedPlanWorkout) return sugeridoToQueue(selectedPlanWorkout, exerciseMap);
      if (suggestedWorkout && selectedPresetId === suggestedWorkout.preset_id) {
        return sugeridoToQueue(suggestedWorkout, exerciseMap);
      }
      if (!selectedPreset) return [];
      return presetToQueue(selectedPreset, exerciseMap, nivel);
    })();
    // Em recomendações/presets, a configuração do usuário é a fonte de verdade.
    // Treinos personalizados/salvos preservam ajustes explícitos por exercício.
    const preservesPerExerciseRest = selectedPresetId === 'custom' || Boolean(selectedSavedWorkout);
    return raw.map((item) => ({
      ...item,
      descanso_seg: preservesPerExerciseRest
        ? (item.descanso_seg ?? globalDescanso)
        : globalDescanso,
    }));
  }, [
    selectedPresetId,
    selectedSavedWorkout,
    selectedPlanWorkout,
    suggestedWorkout,
    selectedPreset,
    customWorkout,
    exerciseMap,
    nivel,
    globalDescanso,
  ]);

  const activeQueue = draftQueue ?? baseQueue;
  const sortableIds = activeQueue.map((item, i) => `${item.slug}-${i}`);

  const applyRepScheme = useCallback(
    (
      scheme: RepSchemeRecommendation,
      scope: 'all' | number,
      options?: {
        force?: boolean;
        sourceQueue?: WorkoutQueueItem[];
        persistSelection?: boolean;
      },
    ) => {
      setSelectedSchemeId(scheme.id);
      if (options?.persistSelection !== false) {
        setSelectedRepSchemeId(nivel, scheme.id);
      }
      const base = options?.sourceQueue ?? draftQueue ?? baseQueue;
      const force = options?.force ?? false;

      const next = base.map((item, idx) => {
        if (scope !== 'all' && idx !== scope) return item;
        if (scope === 'all' && !force && customizedIndices.has(idx)) return item;
        if (item.modo === 'tempo') {
          // Exercícios de segurar acompanham o esquema pelo tempo, não pelas reps.
          if (!scheme.tempo_seg) return item;
          return { ...item, series: scheme.series, tempo_seg: scheme.tempo_seg };
        }
        return {
          ...item,
          series: scheme.series,
          repeticoes: scheme.repeticoes,
          modo: 'reps' as ModoExercicio,
        };
      });

      setDraftQueue(next);
      if (selectedPresetId === 'custom') setCustomWorkout(next);

      if (scope === 'all' && force) {
        setCustomizedIndices(new Set());
      } else if (typeof scope === 'number') {
        setCustomizedIndices((prev) => new Set(prev).add(scope));
      }
    },
    [
      draftQueue,
      baseQueue,
      selectedPresetId,
      setCustomWorkout,
      customizedIndices,
      nivel,
      setSelectedRepSchemeId,
    ],
  );

  useEffect(() => {
    if (
      authUser?.ab_training_profile_v2 ||
      draftQueue !== null ||
      !selectedSchemeId ||
      baseQueue.length === 0
    )
      return;

    const scheme = schemes.find((entry) => entry.id === selectedSchemeId);
    if (!scheme) return;

    const key = `${selectedPresetId}|${baseQueue.map((item) => item.slug).join('|')}`;
    if (lastAppliedQueueKeyRef.current === key) return;
    lastAppliedQueueKeyRef.current = key;

    applyRepScheme(scheme, 'all', { force: true, sourceQueue: baseQueue });
  }, [
    authUser?.ab_training_profile_v2,
    selectedPresetId,
    baseQueue,
    draftQueue,
    selectedSchemeId,
    schemes,
    applyRepScheme,
  ]);

  const persistDraftIfCustom = useCallback(
    (next: WorkoutQueueItem[]) => {
      if (selectedPresetId === 'custom') setCustomWorkout(next);
    },
    [selectedPresetId, setCustomWorkout],
  );

  const handleSelectScheme = (scheme: StoredRepScheme) => {
    lastAppliedQueueKeyRef.current = '';
    applyRepScheme(scheme, 'all', { force: true });
  };

  const handleDeleteScheme = (schemeId: string) => {
    const next = removeRepScheme(nivel, schemeId);
    if (selectedSchemeId === schemeId) {
      lastAppliedQueueKeyRef.current = '';
      const fallbackId = next[0]?.id ?? null;
      setSelectedSchemeId(fallbackId);
      if (fallbackId) setSelectedRepSchemeId(nivel, fallbackId);
    }
  };

  const [schemeLevel, setSchemeLevel] = useState<NivelUsuario>(nivel);
  const [schemeLevelBusy, setSchemeLevelBusy] = useState(false);

  // Nível trocado em outro lugar (Perfil, outro dispositivo) reflete no botão.
  useEffect(() => {
    setSchemeLevel(nivel);
  }, [nivel]);

  /**
   * Troca o nível de TREINO inteiro: atualiza o nível do perfil (os treinos
   * recomendados seguem o novo nível) e aplica os 3 esquemas recomendados
   * dele — sobrescreve os salvos, comportamento documentado do botão.
   */
  const cycleSchemeLevel = async () => {
    if (schemeLevelBusy) return;
    const order: NivelUsuario[] = ['iniciante', 'intermediario', 'avancado'];
    const nextLevel = order[(order.indexOf(schemeLevel) + 1) % order.length]!;
    setSchemeLevelBusy(true);
    setSchemeLevel(nextLevel);

    const recommended: StoredRepScheme[] = REP_SCHEME_BY_NIVEL[nextLevel].map((scheme) => ({
      ...scheme,
      isCustom: false,
    }));
    lastAppliedQueueKeyRef.current = '';
    const first = recommended[0];
    if (first) {
      setRepSchemeConfiguration(nextLevel, recommended, first.id);
      setSelectedSchemeId(first.id);
      applyRepScheme(first, 'all', { force: true, persistSelection: false });
    }

    try {
      const atualizado = await updateMe({ nivel: nextLevel });
      applyUser(atualizado);
      void loadRecommendations({ force: true });
      showGameToast(`Nível ${NIVEL_LABELS[nextLevel]} — treinos e esquemas atualizados.`, {
        variant: 'success',
      });
    } catch (err) {
      setSchemeLevel(nivel);
      showGameToast(getErrorMessage(err, 'Não foi possível trocar o nível.'), {
        variant: 'error',
      });
    } finally {
      setSchemeLevelBusy(false);
    }
  };

  const handleCreateScheme = (scheme: RepSchemeRecommendation) => {
    if (schemes.length >= MAX_REP_SCHEMES) {
      showGameToast(`Máx. de ${MAX_REP_SCHEMES} esquemas — remova um pra criar outro.`, {
        variant: 'warn',
      });
      return;
    }
    const next = addRepScheme(nivel, { ...scheme, isCustom: true });
    lastAppliedQueueKeyRef.current = '';
    const created = next[0];
    if (created) {
      setSelectedSchemeId(created.id);
      applyRepScheme(created, 'all', { force: true });
    }
  };

  const selectPreset = useCallback(
    (id: string | 'custom') => {
      setDismissedCardKey(null);
      if (id === 'custom') {
        setActiveTab('customize');
        setSelectedPresetId('custom');
        setDraftQueue(null);
        setCustomizedIndices(new Set());
        lastAppliedQueueKeyRef.current = '';
        scrollToSection(customWorkout.length > 0 ? 'builder-queue' : 'builder-add-exercise');
        return;
      }

      setActiveTab('train');
      setSelectedPresetId(id);
      setDraftQueue(null);
      setCustomizedIndices(new Set());
      lastAppliedQueueKeyRef.current = '';
      scrollToSection('builder-queue-preview');
    },
    [customWorkout.length, scrollToSection, setActiveTab],
  );

  const handleSelectCiclo = useCallback(
    (ciclo: TreinoBase) => {
      const preset = pickPresetForCycle(allPresets, ciclo, nivel, objetivo);
      if (!preset) {
        showGameToast(`Nenhum treino disponível para o ciclo ${ciclo}.`, { variant: 'warn' });
        return;
      }
      selectPreset(preset.id);
      showGameToast(`Ciclo ${ciclo} — ${CICLO_LABELS[ciclo]}`, { variant: 'info' });
    },
    [allPresets, nivel, objetivo, selectPreset],
  );

  const handleSelectDia = useCallback(
    async (indice: number) => {
      try {
        const treino = await getRecommendWorkout({ dia: indice, shuffle: false });
        setDismissedCardKey(null);
        setPlanOverride(treino);
        lastSyncedSuggestedRef.current = treino.preset_id;
        setSelectedPresetId(treino.preset_id);
        setDraftQueue(null);
        setCustomizedIndices(new Set());
        setActiveTab('train');
        scrollToSection('builder-queue-preview');
      } catch {
        showGameToast('Não foi possível carregar esse treino.', { variant: 'warn' });
      }
    },
    [scrollToSection, setActiveTab],
  );

  const swapSourceItem = swapExerciseIndex != null ? activeQueue[swapExerciseIndex] : null;

  const similarExerciseOptions = useMemo(() => {
    if (!swapSourceItem) return [];
    const ref = exerciseMap.get(swapSourceItem.slug);
    if (!ref) return [];

    const catalog = exercises.filter(
      (ex) => ex.ativo !== false && !blockedExerciseSlugs.includes(ex.slug),
    );
    const ranked = filterSimilarExercises(
      {
        slug: ref.slug,
        musculo_principal: ref.musculo_principal,
        modo: ref.modo === 'reps' ? 'reps' : 'tempo',
        prioridade: ref.prioridade,
      },
      catalog.map((ex) => ({
        slug: ex.slug,
        musculo_principal: ex.musculo_principal,
        modo: ex.modo === 'reps' ? 'reps' : 'tempo',
        prioridade: ex.prioridade,
        nome: ex.nome,
        nome_pt: ex.nome_pt,
      })),
      { queueSlugs: activeQueue.map((q) => q.slug) },
    );

    return ranked;
  }, [swapSourceItem, exerciseMap, exercises, blockedExerciseSlugs, activeQueue]);

  const confirmSwapExercise = useCallback(
    (newSlug: string) => {
      if (swapExerciseIndex == null) return;
      const ex = exerciseMap.get(newSlug);
      const current = activeQueue[swapExerciseIndex];
      if (!ex || !current) return;

      const params = getExerciseParamsForNivel(ex, nivel);
      const useReps = current.modo === 'reps' && ex.modo === 'reps';
      // O esquema escolhido prevalece sobre os padrões do exercício novo.
      const scheme = selectedSchemeId
        ? (schemes.find((entry) => entry.id === selectedSchemeId) ?? null)
        : null;

      const replacement: WorkoutQueueItem = {
        slug: ex.slug,
        nome: ex.nome,
        nome_pt: ex.nome_pt,
        exercicio_id: ex.id,
        musculo_principal: ex.musculo_principal,
        tempo_recomendado: params.tempo_seg || ex.tempo_recomendado || 30,
        modo: useReps ? 'reps' : params.modo,
        series: scheme?.series ?? current.series,
        repeticoes: useReps
          ? (scheme?.repeticoes ?? current.repeticoes ?? params.repeticoes)
          : params.repeticoes,
        tempo_seg: useReps
          ? undefined
          : (scheme?.tempo_seg ?? current.tempo_seg ?? params.tempo_seg),
        descanso_seg: current.descanso_seg ?? globalDescanso,
      };

      const next = activeQueue.map((item, i) => (i === swapExerciseIndex ? replacement : item));
      setDraftQueue(next);
      persistDraftIfCustom(next);
      setSwapExerciseIndex(null);
      showGameToast(`Trocado por ${formatExerciseName(replacement)}.`, { variant: 'success' });
    },
    [
      swapExerciseIndex,
      exerciseMap,
      activeQueue,
      nivel,
      globalDescanso,
      persistDraftIfCustom,
      selectedSchemeId,
      schemes,
    ],
  );

  const handleTabChange = (tab: BuilderTab) => {
    setActiveTab(tab);
    if (tab === 'customize' && selectedPresetId !== 'custom') {
      setSelectedPresetId('custom');
      setDraftQueue(null);
      setCustomizedIndices(new Set());
      lastAppliedQueueKeyRef.current = '';
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(activeQueue, oldIndex, newIndex);
    setDraftQueue(next);
    persistDraftIfCustom(next);

    setCustomizedIndices((prev) => {
      const remapped = new Set<number>();
      prev.forEach((idx) => {
        if (idx === oldIndex) remapped.add(newIndex);
        else if (oldIndex < newIndex && idx > oldIndex && idx <= newIndex) remapped.add(idx - 1);
        else if (oldIndex > newIndex && idx >= newIndex && idx < oldIndex) remapped.add(idx + 1);
        else remapped.add(idx);
      });
      return remapped;
    });
  };

  const addExercise = (slug: string) => {
    const ex = exerciseMap.get(slug);
    if (!ex) return;
    const params = getExerciseParamsForNivel(ex, nivel);
    const scheme = selectedSchemeId ? schemes.find((s) => s.id === selectedSchemeId) : null;

    const item: WorkoutQueueItem = {
      slug: ex.slug,
      nome: ex.nome,
      nome_pt: ex.nome_pt,
      exercicio_id: ex.id,
      musculo_principal: ex.musculo_principal,
      tempo_recomendado: params.tempo_seg || ex.tempo_recomendado,
      modo: params.modo,
      series: scheme && params.modo !== 'tempo' ? scheme.series : 3,
      repeticoes: scheme && params.modo !== 'tempo' ? scheme.repeticoes : params.repeticoes,
      tempo_seg: params.tempo_seg,
      descanso_seg: globalDescanso,
      laterality: ex.laterality ?? 'none',
    };

    const next = [...activeQueue, item];
    setDraftQueue(next);
    persistDraftIfCustom(next);
    scrollToSection('builder-queue', 80);
  };

  const removeExercise = (index: number) => {
    const next = activeQueue.filter((_, i) => i !== index);
    setDraftQueue(next);
    persistDraftIfCustom(next);
    setCustomizedIndices((prev) => {
      const updated = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) updated.add(idx);
        else if (idx > index) updated.add(idx - 1);
      });
      return updated;
    });
  };

  const updateQueueItem = (index: number, patch: Partial<WorkoutQueueItem>) => {
    const next = activeQueue.map((item, i) => (i === index ? { ...item, ...patch } : item));
    setDraftQueue(next);
    persistDraftIfCustom(next);

    if ('series' in patch || 'repeticoes' in patch) {
      setCustomizedIndices((prev) => new Set(prev).add(index));
    }
  };

  const handleSaveWorkout = (nome: string) => {
    if (activeQueue.length === 0) return;

    const existingId = selectedSavedWorkout?.id;
    const preset: SavedWorkoutPreset = {
      id: existingId ?? `saved-${Date.now()}`,
      nome,
      queue: activeQueue.map((item) => ({
        ...item,
        descanso_seg: item.descanso_seg ?? globalDescanso,
      })),
      descanso_padrao_seg: globalDescanso,
      savedAt: new Date().toISOString(),
    };

    saveWorkoutPreset(preset);
    setCustomWorkoutName(nome);
    setSelectedPresetId(toSavedPresetId(preset.id));
    setDraftQueue(null);
    setCustomizedIndices(new Set());
    setActiveTab('train');
    showGameToast(
      existingId ? 'Treino atualizado em Treinos salvos.' : 'Treino salvo em Treinos salvos.',
      { variant: 'success' },
    );
  };

  const proceedToWorkout = () => {
    if (activeQueue.length === 0) return;
    const customName = customWorkoutName.trim() || 'Meu Treino';
    const treinoNome =
      selectedPreset?.nome ?? selectedSavedWorkout?.nome ?? selectedPlanWorkout?.nome ?? customName;
    const treinoTipo: TreinoBase | 'custom' = selectedPreset?.ciclo_id ?? 'custom';
    const payload: ActiveWorkout = {
      treino_nome: treinoNome,
      treino_tipo: treinoTipo,
      ciclo_selecionado: selectedPreset?.ciclo_id,
      queue: activeQueue.map((q) => ({ ...q, descanso_seg: q.descanso_seg ?? globalDescanso })),
      config: { descanso_padrao_seg: globalDescanso },
      preset_id: selectedPresetId !== 'custom' ? selectedPresetId : undefined,
      plano_dia_indice: selectedPlanWorkout?.plano_dia_indice,
    };
    void actionHaptic();
    webWorkoutSessionStorage.write(createWorkoutSnapshot(payload));
    if (selectedPresetId === 'custom') setCustomWorkout(activeQueue);
    navigate('/player');
  };

  useEffect(() => {
    if (!presetFromUrl) return;
    scrollToSection('builder-queue-preview', 120);
  }, [presetFromUrl, scrollToSection]);

  const muscleReferenceProfile = useMemo(() => {
    if (selectedPreset) return getMuscleProfileFromPreset(selectedPreset, exerciseMap);
    if (activeQueue.length > 0) return getMuscleProfileFromQueue(activeQueue);
    return new Map();
  }, [selectedPreset, activeQueue, exerciseMap]);

  const similarPresets = useMemo(
    () =>
      filterSimilarPresets(allPresets, muscleReferenceProfile, exerciseMap, {
        excludeId: selectedPreset?.id ?? null,
        blockedIds: blockedWorkoutIds,
      }),
    [allPresets, muscleReferenceProfile, exerciseMap, selectedPreset?.id, blockedWorkoutIds],
  );

  const similarSavedWorkouts = useMemo(
    () =>
      filterSimilarSavedWorkouts(savedWorkouts, muscleReferenceProfile, {
        excludeId: selectedSavedWorkout?.id ?? null,
      }),
    [savedWorkouts, muscleReferenceProfile, selectedSavedWorkout?.id],
  );

  const similarWorkoutChoices = useMemo(
    () => listSimilarWorkoutChoices(similarPresets, similarSavedWorkouts),
    [similarPresets, similarSavedWorkouts],
  );

  const applySimilarChoice = (choice: { kind: 'preset' | 'saved'; id: string }) => {
    if (choice.kind === 'preset') {
      selectPreset(choice.id);
    } else {
      selectPreset(toSavedPresetId(choice.id));
    }
    setShowSimilarWorkout(false);
    void loadRecommendations({ force: true });
  };

  const handleSelectSimilarPreset = (presetId: string) => {
    applySimilarChoice({ kind: 'preset', id: presetId });
    showGameToast('Treino similar selecionado.', { variant: 'success' });
  };

  const handleSelectSimilarSaved = (savedId: string) => {
    applySimilarChoice({ kind: 'saved', id: savedId });
    showGameToast('Treino similar selecionado.', { variant: 'success' });
  };

  const handleSwapWorkout = async () => {
    if (selectedPlanWorkout?.plano_dia_indice != null) {
      try {
        const treino = await getRecommendWorkout({
          shuffle: true,
          allowRepeats: true,
          dia: selectedPlanWorkout.plano_dia_indice,
        });
        setPlanOverride(treino);
        setDraftQueue(null);
        setCustomizedIndices(new Set());
        showGameToast('Nova variação do treino selecionada.', { variant: 'success' });
      } catch {
        showGameToast('Não foi possível sortear outra variação.', { variant: 'warn' });
      }
      return;
    }

    if (similarWorkoutChoices.length >= 2) {
      setShowSimilarWorkout(true);
      return;
    }

    if (similarWorkoutChoices.length === 1) {
      applySimilarChoice(similarWorkoutChoices[0]!);
      showGameToast('Treino trocado por opção similar.', { variant: 'success' });
      return;
    }

    const excludePresetId = selectedPreset?.id ?? null;
    if (!excludePresetId) {
      setShowSimilarWorkout(true);
      return;
    }

    try {
      const treino = await getRecommendWorkout({ shuffle: true, excludePresetId });
      selectPreset(treino.preset_id);
      void loadRecommendations({ force: true });
      showGameToast('Treino alternativo selecionado.', { variant: 'success' });
    } catch {
      showGameToast('Nenhum treino similar disponível.', { variant: 'warn' });
    }
  };

  const canSaveWorkout =
    activeQueue.length > 0 && (selectedPresetId === 'custom' || selectedSavedWorkout);
  const saveWorkoutDefaultName =
    selectedSavedWorkout?.nome ?? (customWorkoutName.trim() || 'Meu Treino');

  const estimatedMinutes = useMemo(() => {
    if (activeQueue.length === 0) return null;
    const payload: ActiveWorkout = {
      treino_nome: 'Preview',
      treino_tipo: 'custom',
      queue: activeQueue.map((q) => ({ ...q, descanso_seg: q.descanso_seg ?? globalDescanso })),
      config: { descanso_padrao_seg: globalDescanso },
    };
    return Math.max(1, Math.round(estimateWorkoutDurationSeconds(payload) / 60));
  }, [activeQueue, globalDescanso]);

  if (loading || (presetsLoading && allPresets.length === 0)) return <BuilderSkeleton />;

  return (
    <div className="builder-page flex flex-col gap-5 pb-44 md:pb-8">
      <GamePageHeader eyebrow="Sua sessão recomendada" title="Treino de hoje">
        <div
          className="builder-header__actions flex gap-2"
          role="group"
          aria-label="Atalhos do treino"
        >
          <Link
            to="/biblioteca"
            className="game-icon-btn game-icon-btn--header"
            aria-label="Abrir biblioteca"
            title="Biblioteca"
          >
            <LibraryBig size={20} aria-hidden />
          </Link>
          <Link
            to="/ranking"
            className="game-icon-btn game-icon-btn--header"
            aria-label="Abrir ranking"
            title="Ranking"
          >
            <Podium size={20} aria-hidden />
          </Link>
        </div>
      </GamePageHeader>

      {xpCapReached && <DailyXpCapBanner />}

      <BuilderTabs active={activeTab} onChange={handleTabChange} />

      {activeTab === 'train' && (
        <div
          id="builder-panel-train"
          role="tabpanel"
          aria-labelledby="builder-tab-train"
          className="flex flex-col gap-5"
        >
          <TrainPresetSection
            cicloTreinos={cicloTreinos}
            rodadaDone={rodadaDone}
            suggestedWorkout={suggestedWorkout}
            suggestedPresetId={suggestedPresetId}
            selectedPresetId={selectedPresetId}
            selectedPreset={selectedPreset}
            selectedSavedWorkout={selectedSavedWorkout}
            selectedPlanWorkout={selectedPlanWorkout}
            plan={
              planoTreino && activePlanWorkout
                ? {
                    dias: planoTreino.dias,
                    completados: planoTreino.dias_completados_rodada,
                    selecionadoIndice: selectedPlanWorkout?.plano_dia_indice ?? null,
                    sugeridoIndice: suggestedWorkout?.plano_dia_indice ?? null,
                    onSelectDia: (indice) => void handleSelectDia(indice),
                  }
                : null
            }
            exerciseMap={exerciseMap}
            dismissedCardKey={dismissedCardKey}
            onSelectCiclo={handleSelectCiclo}
            onSelectPreset={selectPreset}
            onSwapWorkout={() => void handleSwapWorkout()}
            onDismissCard={setDismissedCardKey}
          />

          <details className="builder-advanced rounded-2xl border border-stone-200 bg-white/80 p-3">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-extrabold text-stone-700">
              <GraduationCap size={18} aria-hidden />
              Personalização avançada
              <span className="ml-auto text-xs font-semibold text-stone-500">
                {NIVEL_LABELS[schemeLevel]}
              </span>
            </summary>
            <Link
              to="/configuracoes#ajustar-plano"
              state={{ highlightTrainingPlan: true }}
              className="builder-plan-link"
            >
              Ajustar Plano de Treino
              <ArrowRight size={16} aria-hidden />
            </Link>
            <section className="mt-3 border-t border-stone-200 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-stone-800">Esquemas de repetição</p>
                <button
                  type="button"
                  className="builder-level-switch"
                  aria-label="Trocar nível dos treinos e esquemas recomendados"
                  title={`Trocar o nível dos treinos e esquemas (atual: ${NIVEL_LABELS[schemeLevel]})`}
                  disabled={schemeLevelBusy}
                  onClick={() => void cycleSchemeLevel()}
                >
                  <GraduationCap size={15} aria-hidden />
                  <span>Trocar nível</span>
                </button>
              </div>
              <RepSchemeCarousel
                schemes={schemes}
                selectedId={selectedSchemeId}
                nivelLabel={NIVEL_LABELS[schemeLevel]}
                onSelect={handleSelectScheme}
                onDelete={handleDeleteScheme}
                onCreateClick={() => setShowCreateScheme(true)}
              />
            </section>
          </details>

          <section id="builder-queue-preview">
            <WorkoutQueueList
              queue={activeQueue}
              sortableIds={sortableIds}
              exerciseMap={exerciseMap}
              emptyMessage={
                exercisesLoading ? 'Carregando...' : 'Aguardando recomendação de treino...'
              }
              onDragEnd={handleDragEnd}
              onConfigureExercise={setConfigExerciseIndex}
            />
          </section>
        </div>
      )}

      {activeTab === 'customize' && (
        <div
          id="builder-panel-customize"
          role="tabpanel"
          aria-labelledby="builder-tab-customize"
          className="flex flex-col gap-5"
        >
          <div className="glass-card p-4">
            <h3 className="game-section-title !mb-1">Meu Treino</h3>
            <p className="text-xs font-semibold text-stone-500">
              Monte sua fila personalizada: busque exercícios, reordene e ajuste séries/repetições.
            </p>
            <label
              htmlFor="custom-workout-name"
              className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-stone-500"
            >
              Nome do treino
            </label>
            <input
              id="custom-workout-name"
              className="game-input mt-2 w-full"
              value={customWorkoutName}
              onChange={(e) => setCustomWorkoutName(e.target.value)}
              placeholder="Ex.: Treino em casa"
              autoComplete="off"
              maxLength={64}
            />
          </div>

          <ExercisePicker exercises={exercises} loading={exercisesLoading} onAdd={addExercise} />

          <section id="builder-queue">
            <WorkoutQueueList
              queue={activeQueue}
              sortableIds={sortableIds}
              exerciseMap={exerciseMap}
              emptyMessage={
                exercisesLoading ? 'Carregando...' : 'Adicione exercícios da biblioteca acima.'
              }
              onDragEnd={handleDragEnd}
              onConfigureExercise={setConfigExerciseIndex}
              onRemove={removeExercise}
            />
          </section>

          {canSaveWorkout && (
            <GameButton
              variant="secondary"
              className="flex w-full items-center justify-center gap-2"
              onClick={() => setShowSaveWorkout(true)}
            >
              <Bookmark size={18} />
              {selectedSavedWorkout ? 'Atualizar treino salvo' : 'Salvar treino'}
            </GameButton>
          )}
        </div>
      )}

      {stats && (
        <section className="glass-card glass-card--treino p-4">
          <h3 className="game-section-title !mb-1">Equilíbrio do core</h3>
          <p className="mb-3 text-xs font-semibold text-stone-500">
            Como seus treinos distribuíram os estímulos nesta semana.
          </p>
          <MuscleBarChart muscles={stats.musculos_semana} />
        </section>
      )}

      <CreateSchemeModal
        open={showCreateScheme}
        nivel={nivel}
        onClose={() => setShowCreateScheme(false)}
        onCreate={handleCreateScheme}
      />
      <SaveWorkoutModal
        open={showSaveWorkout}
        defaultName={saveWorkoutDefaultName}
        isUpdate={Boolean(selectedSavedWorkout)}
        onClose={() => setShowSaveWorkout(false)}
        onSave={handleSaveWorkout}
      />

      <SimilarWorkoutModal
        open={showSimilarWorkout}
        onClose={() => setShowSimilarWorkout(false)}
        similarPresets={similarPresets}
        similarSaved={similarSavedWorkouts}
        exerciseMap={exerciseMap}
        currentSelectionId={selectedPresetId}
        fixedWorkoutIds={fixedWorkoutIds}
        blockedWorkoutIds={blockedWorkoutIds}
        onSelectPreset={handleSelectSimilarPreset}
        onSelectSaved={handleSelectSimilarSaved}
        onToggleWorkoutPin={toggleWorkoutPin}
        onToggleWorkoutBlock={toggleWorkoutBlock}
      />

      <SimilarExerciseModal
        open={swapExerciseIndex != null}
        onClose={() => setSwapExerciseIndex(null)}
        sourceName={swapSourceItem ? formatExerciseName(swapSourceItem) : ''}
        options={similarExerciseOptions}
        exerciseMap={exerciseMap}
        onSelect={confirmSwapExercise}
      />

      <ExerciseConfigModal
        item={configExerciseIndex === null ? null : (activeQueue[configExerciseIndex] ?? null)}
        index={configExerciseIndex}
        defaultRestSeconds={globalDescanso}
        schemes={schemes}
        isPinned={
          configExerciseIndex === null
            ? false
            : fixedExerciseSlugs.includes(activeQueue[configExerciseIndex]?.slug ?? '')
        }
        isBlocked={
          configExerciseIndex === null
            ? false
            : blockedExerciseSlugs.includes(activeQueue[configExerciseIndex]?.slug ?? '')
        }
        onClose={() => setConfigExerciseIndex(null)}
        onSwap={() => {
          if (configExerciseIndex === null) return;
          setSwapExerciseIndex(configExerciseIndex);
          setConfigExerciseIndex(null);
        }}
        onTogglePin={() => {
          if (configExerciseIndex === null) return;
          const slug = activeQueue[configExerciseIndex]?.slug;
          if (slug) toggleExercisePin(slug);
        }}
        onToggleBlock={() => {
          if (configExerciseIndex === null) return;
          const slug = activeQueue[configExerciseIndex]?.slug;
          if (slug) toggleExerciseBlock(slug);
        }}
        onApplyScheme={(scheme, index) => applyRepScheme(scheme, index)}
        onUpdate={updateQueueItem}
      />

      <AbTrainingProfileWizard
        open={!authUser?.ab_training_profile_v2 || showAbPlan}
        firstVisit={!authUser?.ab_training_profile_v2}
        onClose={() => {
          if (!authUser?.ab_training_profile_v2) navigate('/');
          else setShowAbPlan(false);
        }}
        onReady={() => {
          lastSyncedSuggestedRef.current = null;
          lastAppliedQueueKeyRef.current = '';
          setDraftQueue(null);
          setCustomizedIndices(new Set());
          void loadRecommendations({ force: true });
        }}
      />

      <BuilderStickyBar
        exerciseCount={activeQueue.length}
        estimatedMinutes={estimatedMinutes}
        disabled={activeQueue.length === 0}
        onStart={proceedToWorkout}
      />
    </div>
  );
}
