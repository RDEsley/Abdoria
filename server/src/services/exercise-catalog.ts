import { Exercise, type ExerciseDocument } from '../domain/Exercise.js';
import type { UserRecord } from '../domain/User.js';
import type { MusculoPrincipal, Prioridade, UserPreferencias } from '../types/index.js';
import { isBodyweightExercise, isRetiredExerciseSlug } from '../../../shared/exercises.js';

export interface ExerciseCatalogFilter {
  musculo?: MusculoPrincipal;
  nivel?: number;
  prioridade?: Prioridade;
}

function matchesFilter(exercise: ExerciseDocument, filter: ExerciseCatalogFilter): boolean {
  if (filter.musculo && exercise.musculo_principal !== filter.musculo) {
    const secondary = exercise.musculos_secundarios ?? [];
    if (!secondary.includes(filter.musculo)) return false;
  }
  if (filter.nivel != null && exercise.nivel !== filter.nivel) return false;
  if (filter.prioridade && exercise.prioridade !== filter.prioridade) return false;
  return true;
}

function sortExercises(a: ExerciseDocument, b: ExerciseDocument): number {
  const priority = a.prioridade.localeCompare(b.prioridade);
  return priority !== 0 ? priority : a.nome.localeCompare(b.nome);
}

/**
 * Lista exclusivamente movimentos ativos de peso corporal. `preferencias`
 * permanece na assinatura para compatibilidade com os consumidores atuais;
 * preferências legadas não alteram mais o catálogo.
 */
export async function findExercisesForUser(
  _preferencias?: UserPreferencias | null,
  filter: ExerciseCatalogFilter = {},
): Promise<ExerciseDocument[]> {
  const active = await Exercise.find({ ativo: true }, { sort: { prioridade: 1, nome: 1 } });
  return active
    .filter(
      (exercise) =>
        !isRetiredExerciseSlug(exercise.slug) &&
        isBodyweightExercise(exercise) &&
        matchesFilter(exercise, filter),
    )
    .sort(sortExercises);
}

export function filterRowsByAvailableSlugs<T extends { slug: string }>(
  rows: T[],
  available: ExerciseDocument[],
): T[] {
  const slugs = new Set(available.map((exercise) => exercise.slug));
  return rows.filter((row) => slugs.has(row.slug));
}

export async function findExercisesForUserDocument(
  user: UserRecord,
  filter?: ExerciseCatalogFilter,
) {
  return findExercisesForUser(user.preferencias, filter);
}
