import { Exercise, type ExerciseDocument } from '../domain/Exercise.js';
import type { UserDocument } from '../domain/User.js';
import type { MusculoPrincipal, Prioridade, UserPreferencias } from '../types/index.js';
import {
  getEnabledEquipmentIds,
  isExerciseAvailableForUser,
  type EquipmentId,
} from '../../../shared/equipment/index.js';

export interface ExerciseCatalogFilter {
  musculo?: MusculoPrincipal;
  nivel?: number;
  prioridade?: Prioridade;
}

function matchesFilter(ex: ExerciseDocument, filter: ExerciseCatalogFilter): boolean {
  if (filter.musculo && ex.musculo_principal !== filter.musculo) {
    const secondary = ex.musculos_secundarios ?? [];
    if (!secondary.includes(filter.musculo)) return false;
  }
  if (filter.nivel != null && ex.nivel !== filter.nivel) return false;
  if (filter.prioridade && ex.prioridade !== filter.prioridade) return false;
  return true;
}

function sortExercises(a: ExerciseDocument, b: ExerciseDocument): number {
  const pa = a.prioridade.localeCompare(b.prioridade);
  if (pa !== 0) return pa;
  return a.nome.localeCompare(b.nome);
}

/** Lista exercícios disponíveis para o usuário (catálogo + equipamentos possuídos). */
export async function findExercisesForUser(
  preferencias?: UserPreferencias | null,
  filter: ExerciseCatalogFilter = {},
): Promise<ExerciseDocument[]> {
  const enabled = getEnabledEquipmentIds(preferencias);
  const [active, gated] = await Promise.all([
    Exercise.find({ ativo: true }, { sort: { prioridade: 1, nome: 1 } }),
    enabled.length > 0
      ? Exercise.find({ ativo: false, equipamento: { $in: enabled } })
      : Promise.resolve([]),
  ]);

  const merged = new Map<string, ExerciseDocument>();
  for (const ex of [...active, ...gated]) {
    if (matchesFilter(ex, filter)) {
      merged.set(ex.slug, ex);
    }
  }

  return [...merged.values()].sort(sortExercises);
}

export function filterRowsByAvailableSlugs<T extends { slug: string }>(
  rows: T[],
  available: ExerciseDocument[],
): T[] {
  const slugs = new Set(available.map((e) => e.slug));
  return rows.filter((row) => slugs.has(row.slug));
}

export function isSlugAvailable(
  slug: string,
  exercises: ExerciseDocument[],
  preferencias?: UserPreferencias | null,
): boolean {
  const ex = exercises.find((e) => e.slug === slug);
  if (!ex) return false;
  return isExerciseAvailableForUser(
    { ativo: ex.ativo, equipamento: ex.equipamento as EquipmentId | null | undefined },
    preferencias,
  );
}

export async function findExercisesForUserDocument(user: UserDocument, filter?: ExerciseCatalogFilter) {
  return findExercisesForUser(user.preferencias, filter);
}
