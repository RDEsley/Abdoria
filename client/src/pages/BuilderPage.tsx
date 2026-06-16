import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, Settings2 } from 'lucide-react';
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
import { SortableExerciseItem } from '@/components/builder/SortableExerciseItem';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { getRecommendedPresets } from '@/lib/api';
import { saveCustomWorkout } from '@/lib/custom-workout-storage';
import type {
  ActiveWorkout,
  IExerciseDocument,
  IWorkoutPresetDocument,
  ModoExercicio,
  NivelUsuario,
  RepSchemeRecommendation,
  TreinoBase,
  WorkoutQueueItem,
} from '@/types';
import {
  REP_SCHEME_BY_NIVEL,
  formatExercisePrescription,
  getExerciseParamsForNivel,
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
        exercicio_id: ex._id,
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
  return `${count} exercícios${reps > 0 ? ` · ${reps} com reps` : ''}`;
}

export function BuilderPage() {
  const { exercises, customWorkout, setCustomWorkout, exercisesLoading, ensureExercises, user } = useApp();
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

  const nivel: NivelUsuario = user?.nivel ?? authUser?.nivel ?? 'iniciante';
  const repSchemes = REP_SCHEME_BY_NIVEL[nivel];

  useEffect(() => {
    void ensureExercises();
  }, [ensureExercises]);

  useEffect(() => {
    void getRecommendedPresets().then((list) => {
      setPresets(list);
      if (presetFromUrl && list.some((p) => p._id === presetFromUrl)) {
        setSelectedPresetId(presetFromUrl);
      } else if (list.length > 0 && selectedPresetId === 'custom' && !customWorkout.length) {
        setSelectedPresetId(list[0]._id);
      }
    }).catch(() => setPresets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- presetFromUrl only on mount
  }, [presetFromUrl]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.slug, e])),
    [exercises],
  );

  const selectedPreset = presets.find((p) => p._id === selectedPresetId);

  const baseQueue = useMemo(() => {
    if (selectedPresetId === 'custom') return customWorkout;
    if (!selectedPreset) return [];
    return presetToQueue(selectedPreset, exerciseMap, nivel);
  }, [selectedPresetId, selectedPreset, customWorkout, exerciseMap, nivel]);

  const activeQueue = draftQueue ?? baseQueue;
  const sortableIds = activeQueue.map((item, i) => `${item.slug}-${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectPreset = (id: string | 'custom') => {
    setSelectedPresetId(id);
    setDraftQueue(null);
    setSelectedSchemeId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(activeQueue, oldIndex, newIndex);
    setDraftQueue(next);
    if (selectedPresetId === 'custom') setCustomWorkout(next);
  };

  const addExercise = () => {
    const ex = exerciseMap.get(addSlug);
    if (!ex) return;
    const params = getExerciseParamsForNivel(ex, nivel);
    const item: WorkoutQueueItem = {
      slug: ex.slug,
      nome: ex.nome,
      exercicio_id: ex._id,
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
    if (selectedPresetId === 'custom') setCustomWorkout(next);
    setAddSlug('');
  };

  const updateQueueItem = (index: number, patch: Partial<WorkoutQueueItem>) => {
    const next = activeQueue.map((item, i) => (i === index ? { ...item, ...patch } : item));
    setDraftQueue(next);
    if (selectedPresetId === 'custom') setCustomWorkout(next);
  };

  const applyRepScheme = (scheme: RepSchemeRecommendation, scope: 'all' | number) => {
    setSelectedSchemeId(scheme.id);
    const next = activeQueue.map((item, idx) => {
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
  };

  const startWorkout = () => {
    if (activeQueue.length === 0) return;
    const treinoNome = selectedPreset?.nome ?? 'Meu Treino';
    const treinoTipo: TreinoBase | 'custom' = selectedPreset?.ciclo_id ?? 'custom';
    const payload: ActiveWorkout = {
      treino_nome: treinoNome,
      treino_tipo: treinoTipo,
      queue: activeQueue.map((q) => ({ ...q, descanso_seg: q.descanso_seg ?? globalDescanso })),
      config: { descanso_padrao_seg: globalDescanso },
    };
    sessionStorage.setItem('abdoria_active_workout', JSON.stringify(payload));
    if (selectedPresetId === 'custom') saveCustomWorkout(activeQueue);
    navigate('/player');
  };

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Prepare sua party" title="Missão" />

      {presets.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="game-section-title !mb-0">Quests recomendadas</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {presets.map((p) => (
              <motion.button
                key={p._id}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => selectPreset(p._id)}
                className={`min-w-[180px] shrink-0 cursor-pointer p-3 text-left ${
                  selectedPresetId === p._id ? 'game-quest-card' : 'glass-card'
                }`}
              >
                <span className="text-xs font-bold text-emerald-600">Ciclo {p.ciclo_id}</span>
                <p className="text-sm font-bold text-stone-900">{p.nome.split('—')[1]?.trim() ?? p.nome}</p>
                <p className="mt-1 text-[0.65rem] font-bold text-stone-500">{presetSummary(p)}</p>
                <p className="mt-1 line-clamp-2 text-[0.6rem] font-medium text-stone-400">
                  {p.exercicios.slice(0, 3).map((e) => e.slug.replace(/-/g, ' ')).join(' · ')}
                  {p.exercicios.length > 3 ? '…' : ''}
                </p>
              </motion.button>
            ))}
            <button
              type="button"
              onClick={() => selectPreset('custom')}
              className={`min-w-[120px] shrink-0 cursor-pointer rounded-2xl border-2 p-3 font-bold ${
                selectedPresetId === 'custom' ? 'border-emerald-400 bg-emerald-50/90' : 'glass-card border-white/50'
              }`}
            >
              Meu Treino
            </button>
          </div>
        </section>
      )}

      {selectedPreset && (
        <div className="glass-card rounded-2xl p-3 text-xs font-bold text-stone-600">
          {selectedPreset.descricao}
        </div>
      )}

      <section>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-stone-500">
          Esquemas recomendados ({nivel})
        </p>
        <div className="flex flex-wrap gap-2">
          {repSchemes.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              title={scheme.descricao}
              onClick={() => applyRepScheme(scheme, 'all')}
              className={`game-scheme-chip ${selectedSchemeId === scheme.id ? 'game-scheme-chip--active' : ''}`}
            >
              <span className="game-scheme-chip__label">{scheme.label}</span>
              <span className="game-scheme-chip__hint">{scheme.descricao}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.65rem] font-bold text-stone-400">
          Aplica reps × séries em todos os exercícios de repetição. Ajuste individualmente abaixo.
        </p>
      </section>

      <button
        type="button"
        onClick={() => setShowConfig((s) => !s)}
        className="flex cursor-pointer items-center gap-2 text-sm font-bold text-stone-600"
      >
        <Settings2 size={16} /> Configurar descanso, séries e reps
      </button>

      {showConfig && (
        <div className="glass-card rounded-2xl p-4">
          <label className="text-sm font-bold">Descanso padrão: {globalDescanso}s</label>
          <input type="range" min={10} max={90} value={globalDescanso} onChange={(e) => setGlobalDescanso(Number(e.target.value))} className="mt-2 w-full cursor-pointer" />
          {activeQueue.map((item, idx) => (
            <div key={sortableIds[idx]} className="mt-3 border-t border-stone-100 pt-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-bold">{item.nome}</span>
                  <p className="text-[0.65rem] font-bold text-stone-500">{formatExercisePrescription(item)}</p>
                </div>
                {item.modo === 'reps' && (
                  <div className="flex flex-wrap gap-1">
                    {repSchemes.map((scheme) => (
                      <button
                        key={`${item.slug}-${scheme.id}`}
                        type="button"
                        onClick={() => applyRepScheme(scheme, idx)}
                        className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[0.6rem] font-extrabold text-stone-600 hover:border-emerald-400"
                      >
                        {scheme.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <label>
                  Séries
                  <input type="number" min={1} max={10} value={item.series} onChange={(e) => updateQueueItem(idx, { series: Number(e.target.value) })} className="mt-1 w-full rounded border px-2 py-1" />
                </label>
                <label>
                  Reps
                  <input type="number" min={1} value={item.repeticoes ?? 12} disabled={item.modo === 'tempo'} onChange={(e) => updateQueueItem(idx, { repeticoes: Number(e.target.value), modo: 'reps' as ModoExercicio })} className="mt-1 w-full rounded border px-2 py-1 disabled:opacity-50" />
                </label>
                <label>
                  Descanso
                  <input type="number" min={5} value={item.descanso_seg} onChange={(e) => updateQueueItem(idx, { descanso_seg: Number(e.target.value) })} className="mt-1 w-full rounded border px-2 py-1" />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="glass-card rounded-2xl p-4">
        {activeQueue.length === 0 ? (
          <p className="text-sm text-stone-500">{exercisesLoading ? 'Carregando...' : 'Selecione um preset ou adicione exercícios.'}</p>
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
        <div className="flex gap-2">
          <select value={addSlug} onChange={(e) => setAddSlug(e.target.value)} className="flex-1 cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium">
            <option value="">Adicionar exercício...</option>
            {exercises.map((e) => (
              <option key={e.slug} value={e.slug}>{e.nome}</option>
            ))}
          </select>
          <GameButton variant="secondary" onClick={addExercise} disabled={!addSlug}>+</GameButton>
        </div>
      )}

      <GameButton size="lg" className="flex w-full items-center justify-center gap-2" onClick={startWorkout} disabled={activeQueue.length === 0}>
        <Play size={22} fill="currentColor" />
        Iniciar Treino ({activeQueue.length})
      </GameButton>
    </div>
  );
}
