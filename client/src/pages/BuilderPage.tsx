import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, Check, Settings2, Sparkles, ChevronDown, Play } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CreateSchemeModal } from '@/components/builder/CreateSchemeModal';
import { SaveWorkoutModal } from '@/components/builder/SaveWorkoutModal';
import { RepSchemeCarousel } from '@/components/builder/RepSchemeCarousel';
import { SortableExerciseItem } from '@/components/builder/SortableExerciseItem';
import { SimilarWorkoutModal } from '@/components/builder/SimilarWorkoutModal';
import { SimilarExerciseModal } from '@/components/builder/SimilarExerciseModal';
import { ExercisePicker } from '@/components/builder/ExercisePicker';
import { BuilderTabs, type BuilderTab } from '@/components/builder/BuilderTabs';
import { BuilderStickyBar } from '@/components/builder/BuilderStickyBar';
import { DailyXpCapBanner } from '@/components/builder/DailyXpCapBanner';
import { MuscleTagGroup } from '@/components/builder/MuscleTag';
import { getPresetPrimaryMuscles } from '@/components/builder/builder-muscles';
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
import { PreferenceToggleButtons } from '@/components/library/PreferenceToggleButtons';
import { WheelNumberPicker } from '@/components/ui/WheelNumberPicker';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getPresets, getRecommendWorkout } from '@/lib/api';
import { resolveSelectedRepSchemeId } from '@/lib/user-dados';
import { estimateWorkoutDurationSeconds } from '@/lib/workout-duration';
import type {
  ActiveWorkout,
  IExerciseDocument,
  IWorkoutPresetDocument,
  ModoExercicio,
  NivelUsuario,
  Objetivo,
  RepSchemeRecommendation,
  SavedWorkoutPreset,
  StoredRepScheme,
  TreinoBase,
  WorkoutQueueItem,
} from '@/types';
import {
  CICLO_LABELS,
  NIVEL_LABELS,
  formatExerciseName,
  formatExercisePrescription,
  fromSavedPresetId,
  getExerciseParamsForNivel,
  isSavedPresetId,
  normalizeCicloTreinos,
  toSavedPresetId,
} from '@/types';

function presetToQueue(
  preset: IWorkoutPresetDocument,
  exerciseMap: Map<string, IExerciseDocument>,
  nivel: NivelUsuario,
): WorkoutQueueItem[] {
  return preset.exercicios
    .map((pe) => {
      const ex = exerciseMap.get(pe.slug);
      if (!ex) return null;
      const params = getExerciseParamsForNivel(ex, nivel);
      return {
        slug: ex.slug,
        nome: ex.nome,
        nome_pt: ex.nome_pt,
        exercicio_id: ex.id,
        musculo_principal: ex.musculo_principal,
        tempo_recomendado: params.tempo_seg || ex.tempo_recomendado || 30,
        modo: pe.modo ?? params.modo,
        series: pe.series,
        repeticoes: pe.repeticoes ?? params.repeticoes,
        tempo_seg: pe.tempo_seg ?? params.tempo_seg,
        descanso_seg: pe.descanso_seg ?? params.descanso_seg,
      } satisfies WorkoutQueueItem;
    })
    .filter(Boolean) as WorkoutQueueItem[];
}

function presetSummary(preset: IWorkoutPresetDocument): string {
  const count = preset.exercicios.length;
  const reps = preset.exercicios.filter((e) => e.modo === 'reps' || !e.modo).length;
  return `${count} exercícios${reps > 0 ? ` · ${reps} com repetições` : ''}`;
}

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
    addRepScheme,
    removeRepScheme,
    selectedRepSchemeIds,
    setSelectedRepSchemeId,
    repSchemesByNivel,
    flushPendingUserDados,
    exercisesLoading,
    ensureExercises,
    user,
  } = useApp();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFromUrl = searchParams.get('preset');

  const [activeTab, setActiveTab] = useState<BuilderTab>('train');
  const [allPresets, setAllPresets] = useState<IWorkoutPresetDocument[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | 'custom'>('custom');
  const [draftQueue, setDraftQueue] = useState<WorkoutQueueItem[] | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showSimilarWorkout, setShowSimilarWorkout] = useState(false);
  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(null);
  const [globalDescanso, setGlobalDescanso] = useState<number>(authUser?.preferencias?.descanso_padrao_seg ?? 30);
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
  const schemes = useMemo(
    () => getRepSchemes(nivel),
    [getRepSchemes, nivel, storedSchemeKey],
  );
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

  useEffect(() => {
    setSelectedSchemeId(resolveSelectedRepSchemeId(persistedSchemeId, schemes));
  }, [nivel, persistedSchemeId, schemes]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.slug, e])),
    [exercises],
  );

  const selectedPreset = allPresets.find((p) => p.id === selectedPresetId);
  const selectedSavedWorkout = isSavedPresetId(selectedPresetId)
    ? savedWorkouts.find((entry) => entry.id === fromSavedPresetId(selectedPresetId))
    : undefined;

  const scrollToSection = useCallback((id: string, delay = 0) => {
    const run = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (delay > 0) window.setTimeout(run, delay);
    else window.requestAnimationFrame(run);
  }, []);

  const baseQueue = useMemo(() => {
    if (selectedPresetId === 'custom') return customWorkout;
    if (selectedSavedWorkout) return selectedSavedWorkout.queue;
    if (!selectedPreset) return [];
    return presetToQueue(selectedPreset, exerciseMap, nivel);
  }, [selectedPresetId, selectedSavedWorkout, selectedPreset, customWorkout, exerciseMap, nivel]);

  const activeQueue = draftQueue ?? baseQueue;
  const sortableIds = activeQueue.map((item, i) => `${item.slug}-${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
        if (item.modo === 'tempo') return item;
        if (scope === 'all' && !force && customizedIndices.has(idx)) return item;
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
    [draftQueue, baseQueue, selectedPresetId, setCustomWorkout, customizedIndices, nivel, setSelectedRepSchemeId],
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

  const handleDeleteScheme = (schemeId: string) => {
    const next = removeRepScheme(nivel, schemeId);
    if (selectedSchemeId === schemeId) {
      lastAppliedQueueKeyRef.current = '';
      const fallbackId = next[0]?.id ?? null;
      setSelectedSchemeId(fallbackId);
      if (fallbackId) setSelectedRepSchemeId(nivel, fallbackId);
    }
  };

  const handleCreateScheme = (scheme: RepSchemeRecommendation) => {
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

  const swapSourceItem = swapExerciseIndex != null ? activeQueue[swapExerciseIndex] : null;

  const similarExerciseOptions = useMemo(() => {
    if (!swapSourceItem) return [];
    const ref = exerciseMap.get(swapSourceItem.slug);
    if (!ref) return [];

    const catalog = exercises.filter((ex) => ex.ativo !== false && !blockedExerciseSlugs.includes(ex.slug));
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

      const replacement: WorkoutQueueItem = {
        slug: ex.slug,
        nome: ex.nome,
        nome_pt: ex.nome_pt,
        exercicio_id: ex.id,
        musculo_principal: ex.musculo_principal,
        tempo_recomendado: params.tempo_seg || ex.tempo_recomendado || 30,
        modo: useReps ? 'reps' : params.modo,
        series: current.series,
        repeticoes: useReps ? current.repeticoes ?? params.repeticoes : params.repeticoes,
        tempo_seg: useReps ? undefined : current.tempo_seg ?? params.tempo_seg,
        descanso_seg: current.descanso_seg ?? globalDescanso,
      };

      const next = activeQueue.map((item, i) => (i === swapExerciseIndex ? replacement : item));
      setDraftQueue(next);
      persistDraftIfCustom(next);
      setCustomizedIndices((prev) => new Set(prev).add(swapExerciseIndex));
      setSwapExerciseIndex(null);
      showGameToast(`Trocado por ${formatExerciseName(replacement)}.`, { variant: 'success' });
    },
    [swapExerciseIndex, exerciseMap, activeQueue, nivel, globalDescanso, persistDraftIfCustom],
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
    const treinoNome = selectedPreset?.nome ?? selectedSavedWorkout?.nome ?? customName;
    const treinoTipo: TreinoBase | 'custom' = selectedPreset?.ciclo_id ?? 'custom';
    const payload: ActiveWorkout = {
      treino_nome: treinoNome,
      treino_tipo: treinoTipo,
      ciclo_selecionado: selectedPreset?.ciclo_id,
      queue: activeQueue.map((q) => ({ ...q, descanso_seg: q.descanso_seg ?? globalDescanso })),
      config: { descanso_padrao_seg: globalDescanso },
      preset_id: selectedPresetId !== 'custom' ? selectedPresetId : undefined,
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

  const canSaveWorkout = activeQueue.length > 0 && (selectedPresetId === 'custom' || selectedSavedWorkout);
  const saveWorkoutDefaultName = selectedSavedWorkout?.nome ?? (customWorkoutName.trim() || 'Meu Treino');

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
    <>
      <button
        type="button"
        onClick={() => setShowConfig((s) => !s)}
        className={`game-disclosure ${showConfig ? 'game-disclosure--open' : ''}`}
        aria-expanded={showConfig}
        aria-controls="workout-config-panel"
      >
        <span className="game-disclosure__icon" aria-hidden>
          <Settings2 size={18} />
        </span>
        <span className="game-disclosure__body">
          <span className="game-disclosure__title">Configurar descanso, séries e repetições</span>
          <span className="game-disclosure__hint">
            {showConfig ? 'Toque para recolher' : 'Toque para ajustar descanso, séries e repetições'}
          </span>
        </span>
        <ChevronDown size={20} className="game-disclosure__chevron" aria-hidden />
      </button>

      {showConfig &&
        (activeQueue.length === 0 ? (
          <div className="glass-card game-disclosure-panel rounded-2xl p-4">
            <p className="text-sm text-stone-500">Adicione ou recomende exercícios para ajustar.</p>
          </div>
        ) : (
          <div id="workout-config-panel" className="glass-card game-disclosure-panel rounded-2xl p-4">
            <WheelNumberPicker
              label="Descanso padrão"
              value={globalDescanso}
              min={10}
              max={90}
              suffix="s"
              onChange={setGlobalDescanso}
            />
            {activeQueue.map((item, idx) => (
              <div key={sortableIds[idx]} className="mt-3 border-t border-stone-100 pt-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold">{formatExerciseName(item)}</span>
                    <p className="text-[0.65rem] font-bold text-stone-500">{formatExercisePrescription(item)}</p>
                  </div>
                  {item.modo === 'reps' && (
                    <div className="flex flex-wrap gap-1">
                      {schemes.map((scheme) => (
                        <button
                          key={`${item.slug}-${scheme.id}`}
                          type="button"
                          onClick={() => applyRepScheme(scheme, idx)}
                          className={`rounded-md border px-2 py-0.5 text-[0.6rem] font-extrabold ${
                            selectedSchemeId === scheme.id && !customizedIndices.has(idx)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-400'
                          }`}
                        >
                          {scheme.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <WheelNumberPicker
                    label="Séries"
                    value={item.series}
                    min={1}
                    max={10}
                    onChange={(series) => updateQueueItem(idx, { series })}
                  />
                  <WheelNumberPicker
                    label="Repetições"
                    value={item.repeticoes ?? 12}
                    min={1}
                    max={50}
                    disabled={item.modo === 'tempo'}
                    placeholder="Por tempo"
                    onChange={(repeticoes) => updateQueueItem(idx, { repeticoes, modo: 'reps' as ModoExercicio })}
                  />
                  <WheelNumberPicker
                    label="Descanso (s)"
                    value={item.descanso_seg ?? globalDescanso}
                    min={5}
                    max={90}
                    suffix="s"
                    onChange={(descanso_seg) => updateQueueItem(idx, { descanso_seg })}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
    </>
  );

  return (
    <div className="flex flex-col gap-5 pb-24 md:pb-28">
      <GamePageHeader eyebrow="Escolha ou monte" title="Montar treino" />

      {xpCapReached && <DailyXpCapBanner />}

      <BuilderTabs active={activeTab} onChange={handleTabChange} />

      {activeTab === 'train' && (
        <div id="builder-panel-train" role="tabpanel" aria-labelledby="builder-tab-train" className="flex flex-col gap-5">
          <section id="builder-presets">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <div>
                <h3 className="game-section-title !mb-0">Treino do dia</h3>
                <div className="game-builder-cycle-progress mt-1" role="tablist" aria-label="Ciclos de treino">
                  {cicloTreinos.map((c, i) => {
                    const done = !!rodadaDone[c];
                    const isSuggested = suggestedWorkout?.ciclo_id === c;
                    const isActive = selectedPreset?.ciclo_id === c;
                    return (
                      <Fragment key={c}>
                        {i > 0 && <span className="game-builder-cycle-progress__arrow" aria-hidden>→</span>}
                        <button
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={[
                            'game-builder-cycle-chip',
                            done ? 'game-builder-cycle-chip--done' : '',
                            isActive ? 'game-builder-cycle-chip--active' : '',
                            !isActive && isSuggested ? 'game-builder-cycle-chip--next' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => handleSelectCiclo(c)}
                          title={`Ciclo ${c} — ${CICLO_LABELS[c]}`}
                        >
                          {done && <Check size={10} strokeWidth={3} aria-hidden />}
                          Ciclo {c}
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {suggestedWorkout && suggestedPresetId && selectedPresetId !== suggestedPresetId && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="game-builder-next-banner mb-3"
              >
                <span className="game-builder-next-banner__icon" aria-hidden>
                  <Play size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="game-builder-next-banner__label">Recomendado agora</p>
                  <p className="game-builder-next-banner__title">
                    Ciclo {suggestedWorkout.ciclo_id} —{' '}
                    {suggestedWorkout.nome.split('—')[1]?.trim() ?? suggestedWorkout.nome}
                  </p>
                </div>
                <button
                  type="button"
                  className="game-builder-next-banner__action"
                  onClick={() => selectPreset(suggestedPresetId)}
                >
                  Usar
                </button>
              </motion.div>
            )}

            {(selectedPreset || selectedSavedWorkout) && (
              <div className="glass-card rounded-2xl p-4">
                {selectedPreset && (
                  <>
                    <p className="text-[0.65rem] font-bold text-emerald-600">Ciclo {selectedPreset.ciclo_id}</p>
                    <p className="text-sm font-extrabold text-stone-900">
                      {selectedPreset.nome.split('—')[1]?.trim() ?? selectedPreset.nome}
                    </p>
                    <MuscleTagGroup muscles={getPresetPrimaryMuscles(selectedPreset, exerciseMap)} className="mt-2" />
                    <p className="mt-2 text-xs font-bold text-stone-600">{selectedPreset.descricao}</p>
                    <p className="mt-1 text-[0.65rem] font-bold text-stone-500">{presetSummary(selectedPreset)}</p>
                    <PreferenceToggleButtons
                      className="mt-3"
                      onSwapWorkout={() => void handleSwapWorkout()}
                      swapAriaLabel="Trocar treino similar"
                      isPinned={fixedWorkoutIds.includes(selectedPreset.id)}
                      isBlocked={blockedWorkoutIds.includes(selectedPreset.id)}
                      onTogglePin={() => toggleWorkoutPin(selectedPreset.id)}
                      onToggleBlock={() => toggleWorkoutBlock(selectedPreset.id)}
                      pinAriaLabel="Sempre recomendar este treino"
                      blockAriaLabel="Não recomendar este treino"
                      feedbackKind="workout"
                    />
                  </>
                )}
                {selectedSavedWorkout && (
                  <>
                    <p className="text-[0.65rem] font-bold text-sky-600">Treino salvo</p>
                    <p className="text-sm font-extrabold text-stone-900">{selectedSavedWorkout.nome}</p>
                    <p className="mt-2 text-xs font-bold text-stone-600">
                      {selectedSavedWorkout.queue.length} exercícios personalizados.
                    </p>
                  </>
                )}
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-stone-500">
              Esquemas recomendados ({NIVEL_LABELS[nivel]})
            </p>
            <RepSchemeCarousel
              schemes={schemes}
              selectedId={selectedSchemeId}
              nivelLabel={NIVEL_LABELS[nivel]}
              onSelect={handleSelectScheme}
              onDelete={handleDeleteScheme}
              onCreateClick={() => setShowCreateScheme(true)}
            />
            <p className="mt-2 text-[0.65rem] font-bold text-stone-400">
              O esquema define valores iniciais. Você pode ajustar cada exercício individualmente sem perder o vínculo.
            </p>
          </section>

          <section id="builder-queue-preview" className="glass-card rounded-2xl p-4">
            <h3 className="game-section-title mb-3">Fila do treino</h3>
            {activeQueue.length === 0 ? (
              <p className="text-sm text-stone-500">
                {exercisesLoading ? 'Carregando...' : 'Aguardando recomendação de treino...'}
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col gap-2">
                    {activeQueue.map((item, index) => (
                      <SortableExerciseItem
                        key={sortableIds[index]}
                        id={sortableIds[index]}
                        item={item}
                        index={index}
                        exercise={exerciseMap.get(item.slug)}
                        showPreferences
                        showSwapExercise
                        onSwapExercise={() => setSwapExerciseIndex(index)}
                        isPinned={fixedExerciseSlugs.includes(item.slug)}
                        isBlocked={blockedExerciseSlugs.includes(item.slug)}
                        onTogglePin={() => toggleExercisePin(item.slug)}
                        onToggleBlock={() => toggleExerciseBlock(item.slug)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </section>

          {configSection}
        </div>
      )}

      {activeTab === 'customize' && (
        <div
          id="builder-panel-customize"
          role="tabpanel"
          aria-labelledby="builder-tab-customize"
          className="flex flex-col gap-5"
        >
          <div className="glass-card rounded-2xl p-4">
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

          <section id="builder-queue" className="glass-card rounded-2xl p-4">
            <h3 className="game-section-title">Ordem dos exercícios</h3>
            {activeQueue.length === 0 ? (
              <p className="text-sm text-stone-500">
                {exercisesLoading ? 'Carregando...' : 'Adicione exercícios da biblioteca acima.'}
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col gap-2">
                    {activeQueue.map((item, index) => (
                      <SortableExerciseItem
                        key={sortableIds[index]}
                        id={sortableIds[index]}
                        item={item}
                        index={index}
                        exercise={exerciseMap.get(item.slug)}
                        onRemove={() => removeExercise(index)}
                        showSwapExercise
                        onSwapExercise={() => setSwapExerciseIndex(index)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
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
      />
    </div>
  );
}
