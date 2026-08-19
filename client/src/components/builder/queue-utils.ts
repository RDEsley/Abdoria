import type {
  IExerciseDocument,
  IWorkoutPresetDocument,
  NivelUsuario,
  TreinoSugerido,
  WorkoutQueueItem,
} from '@/types';
import { getExerciseParamsForNivel } from '@/types';

export function presetToQueue(
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

/** Fila a partir de um treino sugerido do plano corpo-todo (dose já resolvida no server). */
export function sugeridoToQueue(
  sugerido: TreinoSugerido,
  exerciseMap: Map<string, IExerciseDocument>,
): WorkoutQueueItem[] {
  return sugerido.exercicios
    .map((se) => {
      const ex = exerciseMap.get(se.slug);
      if (!ex) return null;
      return {
        slug: ex.slug,
        nome: ex.nome,
        nome_pt: ex.nome_pt,
        exercicio_id: ex.id,
        musculo_principal: ex.musculo_principal,
        tempo_recomendado: se.tempo_seg || ex.tempo_recomendado || 30,
        modo: se.modo,
        series: se.series,
        repeticoes: se.repeticoes,
        tempo_seg: se.tempo_seg,
        descanso_seg: se.descanso_seg,
      } satisfies WorkoutQueueItem;
    })
    .filter(Boolean) as WorkoutQueueItem[];
}

export function presetSummary(
  preset: IWorkoutPresetDocument,
  exerciseMap?: Map<string, IExerciseDocument>,
): string {
  const available = exerciseMap
    ? preset.exercicios.filter((exercise) => exerciseMap.has(exercise.slug))
    : preset.exercicios;
  const count = available.length;
  const reps = available.filter((e) => e.modo === 'reps' || !e.modo).length;
  return `${count} exercícios${reps > 0 ? ` · ${reps} com repetições` : ''}`;
}
