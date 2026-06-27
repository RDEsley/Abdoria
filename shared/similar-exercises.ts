import type { ModoExercicio, MusculoPrincipal } from './types/index.js';

const SIMILAR_MUSCLES: Record<MusculoPrincipal, MusculoPrincipal[]> = {
  superior: ['superior', 'core'],
  inferior: ['inferior', 'core'],
  obliquos: ['obliquos', 'core', 'superior'],
  core: ['core', 'superior', 'inferior', 'obliquos'],
  completo: ['completo', 'superior', 'inferior', 'obliquos', 'core'],
};

export interface SimilarExerciseRef {
  slug: string;
  musculo_principal: MusculoPrincipal;
  modo: ModoExercicio;
  prioridade?: string;
}

function isIsometricMechanic(item: Pick<SimilarExerciseRef, 'modo' | 'prioridade'>): boolean {
  return item.modo === 'tempo' || item.prioridade === 'isometrico';
}

/** Pontua similaridade entre dois exercícios (maior = mais parecido). */
export function scoreExerciseSimilarity(reference: SimilarExerciseRef, candidate: SimilarExerciseRef): number {
  if (reference.slug === candidate.slug) return -1;

  let score = 0;

  if (reference.musculo_principal === candidate.musculo_principal) {
    score += 10;
  } else if (SIMILAR_MUSCLES[reference.musculo_principal]?.includes(candidate.musculo_principal)) {
    score += 6;
  }

  if (reference.modo === candidate.modo) score += 6;

  if (isIsometricMechanic(reference) === isIsometricMechanic(candidate)) score += 4;

  return score;
}

export interface FilterSimilarExercisesOptions {
  excludeSlugs?: string[];
  /** Slugs já presentes na fila — evita duplicatas. */
  queueSlugs?: string[];
  minScore?: number;
  limit?: number;
}

export function filterSimilarExercises<T extends SimilarExerciseRef>(
  reference: SimilarExerciseRef,
  candidates: T[],
  options: FilterSimilarExercisesOptions = {},
): T[] {
  const exclude = new Set([
    reference.slug,
    ...(options.excludeSlugs ?? []),
    ...(options.queueSlugs ?? []),
  ]);
  const minScore = options.minScore ?? 8;
  const limit = options.limit ?? 12;

  return candidates
    .filter((c) => !exclude.has(c.slug))
    .map((item) => ({ item, score: scoreExerciseSimilarity(reference, item) }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** Escolhe o preset recomendado para um ciclo (espelha lógica do servidor). */
export interface PresetCyclePick {
  ciclo_id: string;
  nivel?: string;
  objetivo?: string;
  recomendado?: boolean;
}

export function pickPresetForCycle<T extends PresetCyclePick>(
  presets: T[],
  cicloId: string,
  nivel?: string,
  objetivo?: string,
): T | undefined {
  const recommended = presets.filter((p) => p.recomendado !== false && p.ciclo_id === cicloId);
  const tiers: Array<(p: T) => boolean> = [
    (p) => Boolean(nivel && objetivo && p.nivel === nivel && p.objetivo === objetivo),
    (p) => Boolean(nivel && p.nivel === nivel),
    () => true,
  ];

  for (const match of tiers) {
    const found = recommended.find(match);
    if (found) return found;
  }

  return recommended[0];
}
