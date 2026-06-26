import { useEffect } from 'react';
import { Clock, History, Play, Zap } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { formatTrainingDuration } from '@/lib/utils';
import {
  formatExerciseName,
  type IExerciseDocument,
  type IWorkoutHistoryDocument,
  type ModoExercicio,
  type NivelUsuario,
  type WorkoutExerciseEntry,
  type WorkoutQueueItem,
  getExerciseParamsForNivel,
} from '@/types';

function formatWorkoutWhen(date: Date | string): string {
  const d = new Date(date);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000);

  if (diffDays === 0) return `Hoje às ${time}`;
  if (diffDays === 1) return `Ontem às ${time}`;
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  });
}

function historyEntryPrescription(entry: WorkoutExerciseEntry): string {
  const modo = (entry.modo ?? 'reps') as ModoExercicio;
  const series = entry.series ?? 3;
  if (modo === 'reps') {
    return `${entry.repeticoes_realizadas ?? 12} reps × ${series} séries`;
  }
  return `${entry.duracao_segundos ?? 30}s × ${series} séries`;
}

export function workoutHistoryToQueue(
  entries: WorkoutExerciseEntry[],
  exerciseMap: Map<string, IExerciseDocument>,
  nivel: NivelUsuario,
): WorkoutQueueItem[] {
  return entries.map((entry) => {
    const ex = exerciseMap.get(entry.slug);
    const modo = (entry.modo ?? 'reps') as ModoExercicio;
    const params = ex ? getExerciseParamsForNivel(ex, nivel) : null;

    return {
      slug: entry.slug,
      nome: entry.nome,
      nome_pt: ex?.nome_pt,
      exercicio_id: entry.exercicio_id ?? ex?.id,
      musculo_principal: entry.musculo_principal,
      tempo_recomendado: ex?.tempo_recomendado ?? entry.duracao_segundos ?? 30,
      modo,
      series: entry.series ?? 3,
      repeticoes:
        modo === 'reps' ? (entry.repeticoes_realizadas ?? params?.repeticoes ?? 12) : undefined,
      tempo_seg: modo === 'tempo' ? (entry.duracao_segundos ?? params?.tempo_seg ?? 30) : undefined,
      descanso_seg: entry.descanso_seg ?? params?.descanso_seg ?? 30,
    };
  });
}

interface Props {
  exerciseMap: Map<string, IExerciseDocument>;
  onRepeat: (workout: IWorkoutHistoryDocument) => void;
}

export function LastWorkoutPanel({ exerciseMap, onRepeat }: Props) {
  const { history, ensureHistory, historyLoading } = useApp();

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const lastWorkout = history[0] ?? null;

  if (historyLoading) {
    return (
      <section className="game-last-workout glass-card rounded-2xl p-4" aria-busy="true">
        <p className="text-sm font-semibold text-stone-500">Carregando último treino...</p>
      </section>
    );
  }

  if (!lastWorkout) return null;

  const preview = lastWorkout.exercicios.slice(0, 4);
  const moreCount = Math.max(0, lastWorkout.exercicios.length - preview.length);

  return (
    <section className="game-last-workout glass-card rounded-2xl p-4" aria-labelledby="last-workout-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="game-last-workout__icon" aria-hidden>
            <History size={18} />
          </div>
          <div className="min-w-0">
            <h3 id="last-workout-title" className="game-section-title !mb-0">
              Último treino
            </h3>
            <p className="mt-0.5 truncate text-sm font-bold text-stone-800">{lastWorkout.treino_nome}</p>
            <p className="mt-0.5 text-[0.68rem] font-semibold text-stone-500">
              {formatWorkoutWhen(lastWorkout.concluido_em)}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="game-builder-action shrink-0"
          onClick={() => onRepeat(lastWorkout)}
        >
          <Play size={14} aria-hidden />
          Repetir
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-[0.65rem] font-bold text-stone-600">
        <span className="game-last-workout__chip">
          <Clock size={12} aria-hidden />
          {formatTrainingDuration(lastWorkout.duracao_total_segundos)}
        </span>
        <span className="game-last-workout__chip">
          {lastWorkout.exercicios.length} exercício{lastWorkout.exercicios.length === 1 ? '' : 's'}
        </span>
        {(lastWorkout.xp_ganho ?? 0) > 0 && (
          <span className="game-last-workout__chip game-last-workout__chip--xp">
            <Zap size={12} aria-hidden />
            +{lastWorkout.xp_ganho} XP
          </span>
        )}
      </div>

      <ul className="game-last-workout__list">
        {preview.map((entry) => (
          <li key={`${entry.slug}-${entry.exercicio_id}`} className="game-last-workout__item">
            <span className="truncate font-bold text-stone-800">
              {formatExerciseName({ nome: entry.nome, nome_pt: exerciseMap.get(entry.slug)?.nome_pt })}
            </span>
            <span className="shrink-0 text-stone-500">{historyEntryPrescription(entry)}</span>
          </li>
        ))}
        {moreCount > 0 && (
          <li className="game-last-workout__more">+{moreCount} exercício{moreCount === 1 ? '' : 's'}</li>
        )}
      </ul>
    </section>
  );
}
