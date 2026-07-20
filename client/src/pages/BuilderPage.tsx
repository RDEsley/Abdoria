import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, GraduationCap } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { resolveFila } from '@shared/atividades';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { CreateSchemeModal } from '@/components/builder/CreateSchemeModal';
import { SaveWorkoutModal } from '@/components/builder/SaveWorkoutModal';
import { MAX_REP_SCHEMES, RepSchemeCarousel } from '@/components/builder/RepSchemeCarousel';
import { SimilarWorkoutModal } from '@/components/builder/SimilarWorkoutModal';
import { SimilarExerciseModal } from '@/components/builder/SimilarExerciseModal';
import { ExercisePicker } from '@/components/builder/ExercisePicker';
import { BuilderTabs, type BuilderTab } from '@/components/builder/BuilderTabs';
import { BuilderStickyBar } from '@/components/builder/BuilderStickyBar';
import { DailyXpCapBanner } from '@/components/builder/DailyXpCapBanner';
import { TrainPresetSection } from '@/components/builder/TrainPresetSection';
import { WorkoutConfigPanel } from '@/components/builder/WorkoutConfigPanel';
import { WorkoutQueueList } from '@/components/builder/WorkoutQueueList';
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
import { showGameToast } from '@/components/ui/GameToast';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getPresets, getRecommendWorkout, updateMe } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { resolveSelectedRepSchemeId } from '@/lib/user-dados';
import { estimateWorkoutDurationSeconds } from '@/lib/workout-duration';
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

export function BuilderPage() {
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
    saveRepSchemes,
    addRepScheme,
    removeRepScheme,
    selectedRepSchemeIds,
    setSelectedRepSchemeId,
    repSchemesByNivel,
    flushPendingUserDados,
    exercisesLoading,
    ensureExercises,
    user,
    refresh,
  } = useApp();
  const { user: authUser, applyUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFromUrl = searchParams.get('preset');

  // Atividades enfileiradas no Início entram na sequência depois do treino.
  const atividadesNaFila = resolveFila(authUser?.preferencias, getTodaySaoPaulo()).length;

  /** Tira as atividades da fila de hoje sem sair do Construtor — o treino segue só. */
  const handleRemoverAtividadesDaFila = async () => {
    if (!authUser) return;
    try {
      const atualizado = await updateMe({
        preferencias: {
          ...authUser.preferencias,
          atividades_fila: { data: getTodaySaoPaulo(), ids: [] },
        },
      });
      applyUser(atualizado);
      await refresh();
      showGameToast('Atividades tiradas do treino de hoje.', { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível remover as atividades.'), {
        variant: 'error',
      });
    }
  };

  const [activeTab, setActiveTab] = useState<BuilderTab>('train');
  const [allPresets, setAllPresets] = useState<IWorkoutPresetDocument[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | 'custom'>('custom');
  const [draftQueue, setDraftQueue] = useState<WorkoutQueueItem[] | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showSimilarWorkout, setShowSimilarWorkout] = useState(false);
  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(null);
  const [globalDescanso, setGlobalDescanso] = useState<number>(
    authUser?.preferencias?.descanso_padrao_seg ?? 30,
  );
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [showCreateScheme, setShowCreateScheme] = useState(false);
  const [showSaveWorkout, setShowSaveWorkout] = useState(false);
  const [customizedIndices, setCustomizedIndices] = useState<Set<number>>(new Set());
  const lastAppliedQueueKeyRef = useRef('');
  const lastSyncedSuggestedRef = useRef<string | null>(null);

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
  const storedSchemeKey = repSchemesByNivel[nivel]?.map((scheme) => scheme.id).join('|') ?? '';
  const schemes = useMemo(() => getRepSchemes(nivel), [getRepSchemes, nivel, storedSchemeKey]);
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
    void loadRecommendations({ force: true });
  }, [loadRecommendations]);

  useEffect(() => {
    return () => {
      void flushPendingUserDados();
    };
  }, [flushPendingUserDados]);

  useEffect(() => {
    void getPresets()
      .then((list) => {
        setAllPresets(list);
        if (presetFromUrl && list.some((p) => p.id === presetFromUrl)) {
          setSelectedPresetId(presetFromUrl);
          setActiveTab('train');
        }
      })
      .catch(() => setAllPresets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega quando ciclos/nível mudam
  }, [presetFromUrl, cicloTreinosKey, nivel, user?.objetivo]);

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
  }, [suggestedPresetId, allPresets, presetFromUrl, fixedWorkoutIds.length]);

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
  }, [activePlanWorkout, presetFromUrl]);

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
      if (!selectedPreset) return [];
      return presetToQueue(selectedPreset, exerciseMap, nivel);
    })();
    // O descanso padrão do usuário prevalece sobre o descanso gravado no preset.
    return raw.map((item) =>
      item.descanso_seg === globalDescanso ? item : { ...item, descanso_seg: globalDescanso },
    );
  }, [
    selectedPresetId,
    selectedSavedWorkout,
    selectedPlanWorkout,
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
      options?: { force?: boolean; sourceQueue?: WorkoutQueueItem[] },
    ) => {
      setSelectedSchemeId(scheme.id);
      setSelectedRepSchemeId(nivel, scheme.id);
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
    if (draftQueue !== null || !selectedSchemeId || baseQueue.length === 0) return;

    const scheme = schemes.find((entry) => entry.id === selectedSchemeId);
    if (!scheme) return;

    const key = `${selectedPresetId}|${baseQueue.map((item) => item.slug).join('|')}`;
    if (lastAppliedQueueKeyRef.current === key) return;
    lastAppliedQueueKeyRef.current = key;

    applyRepScheme(scheme, 'all', { force: true, sourceQueue: baseQueue });
  }, [selectedPresetId, baseQueue, draftQueue, selectedSchemeId, schemes, applyRepScheme]);

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

  // Descanso padrão manda: sobrescreve o descanso de TODOS os exercícios da fila.
  const handleChangeGlobalDescanso = (value: number) => {
    setGlobalDescanso(value);
    const base = draftQueue ?? baseQueue;
    if (base.length === 0) return;
    const next = base.map((item) => ({ ...item, descanso_seg: value }));
    setDraftQueue(next);
    persistDraftIfCustom(next);
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

  /** Troca os esquemas pelos 3 recomendados de outro nível — sobrescreve os salvos. */
  const cycleSchemeLevel = () => {
    const order: NivelUsuario[] = ['iniciante', 'intermediario', 'avancado'];
    const nextLevel = order[(order.indexOf(schemeLevel) + 1) % order.length];
    setSchemeLevel(nextLevel);
    const recommended: StoredRepScheme[] = REP_SCHEME_BY_NIVEL[nextLevel].map((scheme) => ({
      ...scheme,
      isCustom: false,
    }));
    saveRepSchemes(nivel, recommended);
    lastAppliedQueueKeyRef.current = '';
    const first = recommended[0];
    if (first) {
      setSelectedSchemeId(first.id);
      setSelectedRepSchemeId(nivel, first.id);
      applyRepScheme(first, 'all', { force: true });
    }
    showGameToast(`Esquemas de ${NIVEL_LABELS[nextLevel].toLowerCase()} aplicados.`, {
      variant: 'info',
    });
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

  const selectPreset = (id: string | 'custom') => {
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
  };

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
    [allPresets, nivel, objetivo],
  );

  const handleSelectDia = useCallback(
    async (indice: number) => {
      try {
        const treino = await getRecommendWorkout({ dia: indice, shuffle: false });
        setPlanOverride(treino);
        lastSyncedSuggestedRef.current = treino.preset_id;
        setSelectedPresetId(treino.preset_id);
        setDraftQueue(null);
        setCustomizedIndices(new Set());
        setActiveTab('train');
        scrollToSection('builder-queue-preview');
      } catch {
        showGameToast('Não foi possível carregar essa missão.', { variant: 'warn' });
      }
    },
    [scrollToSection],
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
        tempo_seg: useReps ? undefined : (scheme?.tempo_seg ?? current.tempo_seg ?? params.tempo_seg),
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
    sessionStorage.setItem('abdoria_active_workout', JSON.stringify(payload));
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
        showGameToast('Nova variação da missão sorteada.', { variant: 'success' });
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

  const configSection = (
    <WorkoutConfigPanel
      open={showConfig}
      onToggle={() => setShowConfig((s) => !s)}
      queue={activeQueue}
      sortableIds={sortableIds}
      globalDescanso={globalDescanso}
      onChangeGlobalDescanso={handleChangeGlobalDescanso}
      schemes={schemes}
      selectedSchemeId={selectedSchemeId}
      customizedIndices={customizedIndices}
      onApplySchemeToItem={(scheme, idx) => applyRepScheme(scheme, idx)}
      onUpdateItem={updateQueueItem}
    />
  );

  return (
    <div className="flex flex-col gap-5 pb-24 md:pb-28">
      <GamePageHeader eyebrow="Escolha ou monte" title="Montar treino" />

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
            fixedWorkoutIds={fixedWorkoutIds}
            blockedWorkoutIds={blockedWorkoutIds}
            onSelectCiclo={handleSelectCiclo}
            onSelectPreset={selectPreset}
            onSwapWorkout={() => void handleSwapWorkout()}
            onToggleWorkoutPin={toggleWorkoutPin}
            onToggleWorkoutBlock={toggleWorkoutBlock}
          />

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-stone-800">
                Esquemas recomendados ({NIVEL_LABELS[schemeLevel]})
              </p>
              <button
                type="button"
                className="game-icon-btn shrink-0 gap-2 px-3 py-2 text-xs font-extrabold whitespace-nowrap"
                aria-label="Trocar nível dos esquemas recomendados"
                title={`Trocar para esquemas de outro nível (atual: ${NIVEL_LABELS[schemeLevel]})`}
                onClick={cycleSchemeLevel}
              >
                <GraduationCap size={15} aria-hidden />
                <span>Trocar nível</span>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-stone-600 leading-none">
                  {NIVEL_LABELS[schemeLevel]}
                </span>
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

          {configSection}

          <section id="builder-queue-preview" className="glass-card p-4">
            <h3 className="game-section-title mb-3">Fila do treino</h3>
            <WorkoutQueueList
              queue={activeQueue}
              sortableIds={sortableIds}
              exerciseMap={exerciseMap}
              emptyMessage={
                exercisesLoading ? 'Carregando...' : 'Aguardando recomendação de treino...'
              }
              onDragEnd={handleDragEnd}
              onSwapExercise={setSwapExerciseIndex}
              preferences={{
                fixedExerciseSlugs,
                blockedExerciseSlugs,
                onTogglePin: toggleExercisePin,
                onToggleBlock: toggleExerciseBlock,
              }}
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
              placeholder="Ex.: Meu treino de abdômen"
              autoComplete="off"
              maxLength={64}
            />
          </div>

          <ExercisePicker exercises={exercises} loading={exercisesLoading} onAdd={addExercise} />

          {configSection}

          <section id="builder-queue" className="glass-card p-4">
            <h3 className="game-section-title">Ordem dos exercícios</h3>
            <WorkoutQueueList
              queue={activeQueue}
              sortableIds={sortableIds}
              exerciseMap={exerciseMap}
              emptyMessage={
                exercisesLoading ? 'Carregando...' : 'Adicione exercícios da biblioteca acima.'
              }
              onDragEnd={handleDragEnd}
              onSwapExercise={setSwapExerciseIndex}
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

      <BuilderStickyBar
        exerciseCount={activeQueue.length}
        estimatedMinutes={estimatedMinutes}
        disabled={activeQueue.length === 0}
        onStart={proceedToWorkout}
        atividadesNaFila={atividadesNaFila}
        onRemoverAtividades={
          atividadesNaFila > 0 ? () => void handleRemoverAtividadesDaFila() : undefined
        }
      />
    </div>
  );
}
