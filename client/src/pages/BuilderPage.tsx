import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, Check, Play, RefreshCw, Repeat, Settings2, Sparkles, ChevronDown } from 'lucide-react';
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
import { LastWorkoutPanel, workoutHistoryToQueue } from '@/components/builder/LastWorkoutPanel';
import { CreateSchemeModal } from '@/components/builder/CreateSchemeModal';
import { SaveWorkoutModal } from '@/components/builder/SaveWorkoutModal';
import { DailyXpCapModal } from '@/components/player/DailyXpCapModal';
import { RepSchemeCarousel } from '@/components/builder/RepSchemeCarousel';
import { SortableExerciseItem } from '@/components/builder/SortableExerciseItem';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { SwipeScroll } from '@/components/ui/SwipeScroll';
import { WheelNumberPicker } from '@/components/ui/WheelNumberPicker';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { getRecommendWorkout, getRecommendedPresets } from '@/lib/api';
import type {
  ActiveWorkout,
  IExerciseDocument,
  IWorkoutHistoryDocument,
  IWorkoutPresetDocument,
  ModoExercicio,
  NivelUsuario,
  RepSchemeRecommendation,
  SavedWorkoutPreset,
  StoredRepScheme,
  TreinoBase,
  WorkoutQueueItem,
} from '@/types';
import {
  NIVEL_LABELS,
  formatExerciseName,
  formatExercisePrescription,
  fromSavedPresetId,
  getExerciseParamsForNivel,
  isSavedPresetId,
  normalizeCicloTreinos,
  savedWorkoutSummary,
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
    savedWorkouts,
    stats,
    loadRecommendations,
    setCustomWorkout,
    saveWorkoutPreset,
    getRepSchemes,
    addRepScheme,
    removeRepScheme,
    exercisesLoading,
    ensureExercises,
    user,
  } = useApp();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetFromUrl = searchParams.get('preset');

  const [presets, setPresets] = useState<IWorkoutPresetDocument[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | 'custom'>('custom');
  const [draftQueue, setDraftQueue] = useState<WorkoutQueueItem[] | null>(null);
  const [addSlug, setAddSlug] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [globalDescanso, setGlobalDescanso] = useState<number>(authUser?.preferencias?.descanso_padrao_seg ?? 30);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [showCreateScheme, setShowCreateScheme] = useState(false);
  const [showSaveWorkout, setShowSaveWorkout] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [allowRepeats, setAllowRepeats] = useState(false);
  const [recommendBusy, setRecommendBusy] = useState(false);
  const [showXpCapModal, setShowXpCapModal] = useState(false);
  const schemeApplyKeyRef = useRef('');
  const presetsCarouselRef = useRef<HTMLDivElement>(null);
  const lastSyncedSuggestedRef = useRef<string | null>(null);

  const nivel: NivelUsuario = user?.nivel ?? authUser?.nivel ?? 'iniciante';
  const schemes = getRepSchemes(nivel);
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

  const scrollToPresetCard = useCallback((presetId: string) => {
    window.requestAnimationFrame(() => {
      presetsCarouselRef.current
        ?.querySelector<HTMLElement>(`[data-preset-id="${presetId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }, []);

  useEffect(() => {
    void ensureExercises();
  }, [ensureExercises]);

  useEffect(() => {
    void loadRecommendations({ force: true });
  }, [loadRecommendations]);

  useEffect(() => {
    void getRecommendedPresets()
      .then((list) => {
        setPresets(list);
        if (presetFromUrl && list.some((p) => p.id === presetFromUrl)) {
          setSelectedPresetId(presetFromUrl);
          scrollToPresetCard(presetFromUrl);
        }
      })
      .catch(() => setPresets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega quando ciclos/nível mudam
  }, [presetFromUrl, cicloTreinosKey, nivel, user?.objetivo, scrollToPresetCard]);

  useEffect(() => {
    if (presetFromUrl) return;
    if (!suggestedPresetId || !presets.some((p) => p.id === suggestedPresetId)) return;
    if (lastSyncedSuggestedRef.current === suggestedPresetId) return;
    lastSyncedSuggestedRef.current = suggestedPresetId;
    setSelectedPresetId(suggestedPresetId);
    setDraftQueue(null);
    scrollToPresetCard(suggestedPresetId);
  }, [suggestedPresetId, presets, presetFromUrl, scrollToPresetCard]);

  const handleRecommendAnother = useCallback(async () => {
    setRecommendBusy(true);
    setSaveMessage(null);
    try {
      const treino = await getRecommendWorkout({
        allowRepeats,
        shuffle: true,
        excludePresetId: selectedPresetId !== 'custom' ? selectedPresetId : null,
      });
      setDraftQueue(null);
      lastSyncedSuggestedRef.current = treino.preset_id;
      setSelectedPresetId(treino.preset_id);
      scrollToPresetCard(treino.preset_id);
    } catch {
      setSaveMessage('Não foi possível sugerir outro treino agora.');
    } finally {
      setRecommendBusy(false);
    }
  }, [allowRepeats, selectedPresetId, scrollToPresetCard]);

  useEffect(() => {
    setSelectedSchemeId((current) => {
      if (current && schemes.some((scheme) => scheme.id === current)) return current;
      return schemes[0]?.id ?? null;
    });
  }, [nivel, schemes]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.slug, e])),
    [exercises],
  );

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);
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
    (scheme: RepSchemeRecommendation, scope: 'all' | number, sourceQueue?: WorkoutQueueItem[]) => {
      setSelectedSchemeId(scheme.id);
      const base = sourceQueue ?? draftQueue ?? baseQueue;
      const next = base.map((item, idx) => {
        if (scope !== 'all' && idx !== scope) return item;
        if (item.modo === 'tempo') return item;
        return {
          ...item,
          series: scheme.series,
          repeticoes: scheme.repeticoes,
          modo: 'reps' as ModoExercicio,
        };
      });
      setDraftQueue(next);
      if (selectedPresetId === 'custom') setCustomWorkout(next);
    },
    [draftQueue, baseQueue, selectedPresetId, setCustomWorkout],
  );

  const persistDraftIfCustom = useCallback(
    (next: WorkoutQueueItem[]) => {
      if (selectedPresetId === 'custom') setCustomWorkout(next);
    },
    [selectedPresetId, setCustomWorkout],
  );

  useEffect(() => {
    if (!selectedSchemeId || baseQueue.length === 0) return;
    const scheme = schemes.find((entry) => entry.id === selectedSchemeId);
    if (!scheme) return;

    const key = `${selectedSchemeId}|${selectedPresetId}|${baseQueue.map((item) => item.slug).join('|')}`;
    if (schemeApplyKeyRef.current === key) return;
    schemeApplyKeyRef.current = key;

    applyRepScheme(scheme, 'all', draftQueue === null ? baseQueue : undefined);
  }, [selectedSchemeId, selectedPresetId, baseQueue, schemes, draftQueue, applyRepScheme]);

  const handleSelectScheme = (scheme: StoredRepScheme) => {
    schemeApplyKeyRef.current = '';
    applyRepScheme(scheme, 'all');
  };

  const handleDeleteScheme = (schemeId: string) => {
    const next = removeRepScheme(nivel, schemeId);
    if (selectedSchemeId === schemeId) {
      schemeApplyKeyRef.current = '';
      setSelectedSchemeId(next[0]?.id ?? null);
    }
  };

  const handleCreateScheme = (scheme: RepSchemeRecommendation) => {
    const next = addRepScheme(nivel, { ...scheme, isCustom: true });
    schemeApplyKeyRef.current = '';
    const created = next[0];
    if (created) {
      setSelectedSchemeId(created.id);
      applyRepScheme(created, 'all');
    }
  };

  const selectPreset = (id: string | 'custom') => {
    setSelectedPresetId(id);
    setDraftQueue(null);
    schemeApplyKeyRef.current = '';
    setSaveMessage(null);

    if (id === 'custom') {
      scrollToSection(customWorkout.length > 0 ? 'builder-queue' : 'builder-add-exercise');
      return;
    }

    scrollToSection('builder-queue');
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
  };

  const addExercise = () => {
    const ex = exerciseMap.get(addSlug);
    if (!ex) return;
    const params = getExerciseParamsForNivel(ex, nivel);
    const item: WorkoutQueueItem = {
      slug: ex.slug,
      nome: ex.nome,
      nome_pt: ex.nome_pt,
      exercicio_id: ex.id,
      musculo_principal: ex.musculo_principal,
      tempo_recomendado: params.tempo_seg || ex.tempo_recomendado,
      modo: params.modo,
      series: 3,
      repeticoes: params.repeticoes,
      tempo_seg: params.tempo_seg,
      descanso_seg: globalDescanso,
    };
    const next = [...activeQueue, item];
    setDraftQueue(next);
    persistDraftIfCustom(next);
    setAddSlug('');
    scrollToSection('builder-queue', 80);
  };

  const updateQueueItem = (index: number, patch: Partial<WorkoutQueueItem>) => {
    const next = activeQueue.map((item, i) => (i === index ? { ...item, ...patch } : item));
    setDraftQueue(next);
    persistDraftIfCustom(next);
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
    setSelectedPresetId(toSavedPresetId(preset.id));
    setDraftQueue(null);
    setSaveMessage(existingId ? 'Treino atualizado em Treinos sugeridos.' : 'Treino salvo em Treinos sugeridos.');
    scrollToSection('builder-presets');

    window.setTimeout(() => {
      presetsCarouselRef.current
        ?.querySelector<HTMLElement>(`[data-preset-id="${toSavedPresetId(preset.id)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 280);
  };

  const proceedToWorkout = () => {
    if (activeQueue.length === 0) return;
    const treinoNome = selectedPreset?.nome ?? selectedSavedWorkout?.nome ?? 'Meu Treino';
    const treinoTipo: TreinoBase | 'custom' = selectedPreset?.ciclo_id ?? 'custom';
    const payload: ActiveWorkout = {
      treino_nome: treinoNome,
      treino_tipo: treinoTipo,
      queue: activeQueue.map((q) => ({ ...q, descanso_seg: q.descanso_seg ?? globalDescanso })),
      config: { descanso_padrao_seg: globalDescanso },
      preset_id: selectedPresetId !== 'custom' ? selectedPresetId : undefined,
    };
    sessionStorage.setItem('abdoria_active_workout', JSON.stringify(payload));
    if (selectedPresetId === 'custom') setCustomWorkout(activeQueue);
    navigate('/player');
  };

  const startWorkout = () => {
    if (activeQueue.length === 0) return;
    if (!stats) {
      proceedToWorkout();
      return;
    }
    const canStillEarnExerciseXp =
      stats.xp_hoje < stats.xp_diario_limite || (stats.xp_bonus_restante ?? 0) > 0;
    if (canStillEarnExerciseXp) {
      proceedToWorkout();
      return;
    }
    const hasEnergyDrink = (stats.energy_drink_count ?? 0) > 0;
    const hideWarning = authUser?.preferencias?.ocultar_aviso_xp_diario ?? user?.preferencias?.ocultar_aviso_xp_diario;
    if (hasEnergyDrink || !hideWarning) {
      setShowXpCapModal(true);
      return;
    }
    proceedToWorkout();
  };

  useEffect(() => {
    if (!presetFromUrl) return;
    scrollToSection('builder-queue', 120);
  }, [presetFromUrl, scrollToSection]);

  const handleRepeatLastWorkout = useCallback(
    (workout: IWorkoutHistoryDocument) => {
      const queue = workoutHistoryToQueue(workout.exercicios, exerciseMap, nivel);
      if (queue.length === 0) return;
      setDraftQueue(queue);
      setSelectedPresetId('custom');
      setSaveMessage(null);
      scrollToSection('builder-queue', 80);
    },
    [exerciseMap, nivel, scrollToSection],
  );

  const showPresetsSection = presets.length > 0 || savedWorkouts.length > 0;
  const canSaveWorkout = activeQueue.length > 0 && (selectedPresetId === 'custom' || selectedSavedWorkout);
  const saveWorkoutDefaultName = selectedSavedWorkout?.nome ?? 'Meu Treino';

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Escolha ou monte" title="Montar treino" />

      <LastWorkoutPanel exerciseMap={exerciseMap} onRepeat={handleRepeatLastWorkout} />

      {showPresetsSection && (
        <section id="builder-presets">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <div>
                <h3 className="game-section-title !mb-0">Treinos sugeridos</h3>
                <div className="game-builder-cycle-progress mt-1">
                  {cicloTreinos.map((c, i) => {
                    const done = !!rodadaDone[c];
                    const isNext = suggestedWorkout?.ciclo_id === c;
                    return (
                      <Fragment key={c}>
                        {i > 0 && <span className="game-builder-cycle-progress__arrow" aria-hidden>→</span>}
                        <span
                          className={[
                            'game-builder-cycle-chip',
                            done ? 'game-builder-cycle-chip--done' : '',
                            isNext ? 'game-builder-cycle-chip--next' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {done && <Check size={10} strokeWidth={3} aria-hidden />}
                          Ciclo {c}
                        </span>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`game-builder-action ${recommendBusy ? 'game-builder-action--busy' : ''}`}
                disabled={recommendBusy}
                onClick={() => void handleRecommendAnother()}
              >
                <RefreshCw size={14} className={recommendBusy ? 'animate-spin' : undefined} />
                Outro
              </button>
              <label className={`game-builder-action game-builder-action--toggle ${allowRepeats ? 'game-builder-action--on' : ''}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={allowRepeats}
                  onChange={(e) => setAllowRepeats(e.target.checked)}
                />
                <Repeat size={14} />
                Repetir
              </label>
            </div>
          </div>
          {suggestedWorkout && suggestedPresetId && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`game-builder-next-banner ${
                selectedPresetId === suggestedPresetId ? 'game-builder-next-banner--active' : ''
              }`}
            >
              <span className="game-builder-next-banner__icon" aria-hidden>
                <Play size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="game-builder-next-banner__label">Próximo treino</p>
                <p className="game-builder-next-banner__title">
                  Ciclo {suggestedWorkout.ciclo_id} —{' '}
                  {suggestedWorkout.nome.split('—')[1]?.trim() ?? suggestedWorkout.nome}
                </p>
              </div>
              {selectedPresetId === suggestedPresetId ? (
                <span className="game-builder-next-banner__status">Selecionado</span>
              ) : (
                <button
                  type="button"
                  className="game-builder-next-banner__action"
                  onClick={() => selectPreset(suggestedPresetId)}
                >
                  Usar
                </button>
              )}
            </motion.div>
          )}
          {saveMessage && <p className="game-modal__success mb-2">{saveMessage}</p>}
          <SwipeScroll
            ref={presetsCarouselRef}
            arrows
            className="game-swipe-scroll--snap game-builder-presets flex max-w-full gap-2 pb-2"
            prevLabel="Anterior"
            nextLabel="Próximo"
          >
            {presets.map((p) => {
              const isSuggested = p.id === suggestedPresetId;
              const isSelected = selectedPresetId === p.id;
              return (
              <motion.button
                key={p.id}
                data-preset-id={p.id}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => selectPreset(p.id)}
                className={[
                  'game-builder-preset-card min-w-[112px] max-w-[112px] shrink-0 cursor-pointer p-2 text-left',
                  isSelected ? 'game-builder-preset-card--selected game-quest-card' : 'glass-card',
                  isSuggested ? 'game-builder-preset-card--next' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={
                  isSuggested && isSelected
                    ? `Próximo treino selecionado: Ciclo ${p.ciclo_id}, ${p.nome}`
                    : isSuggested
                      ? `Próximo treino: Ciclo ${p.ciclo_id}, ${p.nome}`
                      : isSelected
                        ? `Treino selecionado: Ciclo ${p.ciclo_id}, ${p.nome}`
                        : `Ciclo ${p.ciclo_id}, ${p.nome}`
                }
              >
                {(isSuggested || isSelected) && (
                  <div className="game-builder-preset-card__badges">
                    {isSuggested && (
                      <span className="game-builder-preset-card__badge game-builder-preset-card__badge--next">
                        Próximo
                      </span>
                    )}
                    {isSelected && !isSuggested && (
                      <span className="game-builder-preset-card__badge game-builder-preset-card__badge--picked">
                        Selecionado
                      </span>
                    )}
                  </div>
                )}
                <span className="text-[0.6rem] font-bold text-emerald-600">Ciclo {p.ciclo_id}</span>
                <p className="line-clamp-2 text-[0.7rem] font-bold leading-tight text-stone-900">
                  {p.nome.split('—')[1]?.trim() ?? p.nome}
                </p>
                <p className="mt-1 text-[0.58rem] font-bold text-stone-500">{presetSummary(p)}</p>
              </motion.button>
            );
            })}
            {savedWorkouts.map((saved) => {
              const savedId = toSavedPresetId(saved.id);
              return (
                <motion.button
                  key={saved.id}
                  data-preset-id={savedId}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => selectPreset(savedId)}
                  className={`game-builder-preset-card min-w-[112px] max-w-[112px] shrink-0 cursor-pointer p-2 text-left ${
                    selectedPresetId === savedId
                      ? 'game-builder-preset-card--selected game-quest-card'
                      : 'glass-card'
                  }`}
                >
                  <span className="text-[0.6rem] font-bold text-sky-600">Salvo</span>
                  <p className="line-clamp-2 text-[0.7rem] font-bold leading-tight text-stone-900">{saved.nome}</p>
                  <p className="mt-1 text-[0.58rem] font-bold text-stone-500">{savedWorkoutSummary(saved)}</p>
                </motion.button>
              );
            })}
            <button
              type="button"
              data-preset-id="custom"
              onClick={() => selectPreset('custom')}
              className={`min-w-[120px] shrink-0 cursor-pointer rounded-2xl border-2 p-3 font-bold ${
                selectedPresetId === 'custom' ? 'border-emerald-400 bg-emerald-50/90' : 'glass-card border-white/50'
              }`}
            >
              Meu Treino
            </button>
          </SwipeScroll>
        </section>
      )}

      {selectedPreset && (
        <div className="glass-card rounded-2xl p-3 text-xs font-bold text-stone-600">
          {selectedPreset.descricao}
        </div>
      )}

      {selectedSavedWorkout && (
        <div className="glass-card rounded-2xl p-3 text-xs font-bold text-stone-600">
          Treino personalizado com {selectedSavedWorkout.queue.length} exercícios. Você pode iniciar agora ou salvar
          novamente após ajustes.
        </div>
      )}

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
          O esquema selecionado aplica repetições × séries em todos os exercícios por contagem.
        </p>
      </section>

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
        <span className={`game-disclosure__badge ${showConfig ? 'game-disclosure__badge--open' : ''}`}>
          {showConfig ? 'Aberto' : 'Fechado'}
        </span>
        <ChevronDown size={20} className="game-disclosure__chevron" aria-hidden />
      </button>

      {showConfig && (
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
                          selectedSchemeId === scheme.id
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-400'
                        }`}
                      >
                        {scheme.label}
                      </button>
                    ))}                  </div>
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
      )}

      <section id="builder-queue" className="glass-card rounded-2xl p-4">
        {activeQueue.length === 0 ? (
          <p className="text-sm text-stone-500">
            {exercisesLoading ? 'Carregando...' : 'Escolha um treino sugerido acima ou adicione exercícios ao seu treino.'}
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {activeQueue.map((item, index) => (
                  <SortableExerciseItem key={sortableIds[index]} id={sortableIds[index]} item={item} index={index} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {selectedPresetId === 'custom' && (
        <div id="builder-add-exercise" className="flex flex-col gap-3">
          <div className="flex gap-2">
            <select value={addSlug} onChange={(e) => setAddSlug(e.target.value)} className="flex-1 cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium">
              <option value="">Adicionar exercício...</option>
              {exercises.map((e) => (
                <option key={e.slug} value={e.slug}>{formatExerciseName(e)}</option>
              ))}
            </select>
            <GameButton variant="secondary" onClick={addExercise} disabled={!addSlug}>+</GameButton>
          </div>
        </div>
      )}

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

      <GameButton size="lg" className="flex w-full items-center justify-center gap-2" onClick={startWorkout} disabled={activeQueue.length === 0}>
        <Play size={22} fill="currentColor" />
        Iniciar Treino ({activeQueue.length})
      </GameButton>

      <DailyXpCapModal
        open={showXpCapModal}
        energyDrinkCount={stats?.energy_drink_count ?? 0}
        onContinue={() => {
          setShowXpCapModal(false);
          proceedToWorkout();
        }}
        onCancel={() => setShowXpCapModal(false)}
      />
    </div>
  );
}
