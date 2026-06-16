import type { IExercise, ModoExercicio, Prioridade } from '../types/index.js';

function isIsometric(prioridade: Prioridade): boolean {
  return prioridade === 'isometrico';
}

export function withLevelParams(
  base: Omit<IExercise, keyof import('../types/index.js').ExerciseLevelParams | 'modo'> & {
    prioridade: Prioridade;
    modo?: ModoExercicio | 'ambos';
  },
): IExercise {
  const iso = isIsometric(base.prioridade);
  const modo: ModoExercicio | 'ambos' = base.modo ?? (iso ? 'tempo' : 'reps');

  return {
    ...base,
    modo,
    repeticoes_iniciante: iso ? 0 : 12,
    repeticoes_intermediario: iso ? 0 : 16,
    repeticoes_avancado: iso ? 0 : 20,
    tempo_seg_iniciante: iso ? 25 : 0,
    tempo_seg_intermediario: iso ? 35 : 0,
    tempo_seg_avancado: iso ? 45 : 0,
    descanso_seg_iniciante: 40,
    descanso_seg_intermediario: 25,
    descanso_seg_avancado: 18,
  };
}

export function withCustomParams(
  base: Omit<IExercise, keyof import('../types/index.js').ExerciseLevelParams | 'modo'> & {
    prioridade: Prioridade;
    modo?: ModoExercicio | 'ambos';
  },
  params: Partial<import('../types/index.js').ExerciseLevelParams>,
): IExercise {
  return { ...withLevelParams(base), ...params };
}
