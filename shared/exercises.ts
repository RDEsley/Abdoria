import type { ExerciseLaterality } from './types/index.js';

/** Apenas para leitura/migração de registros criados antes do catálogo bodyweight-only. */
export type LegacyEquipmentId = 'push_up_board' | 'pull_up_bar' | 'ab_wheel' | 'stability_ball';

export const LEGACY_PUSH_UP_BOARD_EXERCISE_SLUGS = [
  'push-up-board-chest',
  'push-up-board-chest-wide',
  'push-up-board-decline',
  'push-up-board-triceps',
  'push-up-board-triceps-diamond',
  'push-up-board-shoulders',
  'push-up-board-shoulders-pike',
  'push-up-board-back',
  'push-up-board-back-wide',
] as const;

export const ALWAYS_AVAILABLE_PUSH_UP_SLUGS = [
  'push-up',
  'wide-push-up',
  'decline-push-up',
  'close-grip-push-up',
  'diamond-push-up',
  'pike-push-up',
  'pseudo-planche-push-up',
  'scapular-push-up',
  'wide-scapular-push-up',
] as const;

export const RETIRED_EXERCISE_SLUGS = [
  'dead-bug',
  'chair-dips',
  'incline-push-up',
  'knee-push-up',
  'toe-touches',
  'bird-dog',
  'thread-the-needle',
  'calf-raise',
  'bear-crawl',
  'dragon-flag',
  'copenhagen-plank',
  'pull-up',
  'chin-up',
  'scapular-pull-up',
  'dead-hang',
  'ab-wheel-knees',
  'ab-wheel-standing',
  'hanging-knee-raise',
  'stability-ball-crunch',
  'ab-wheel',
  'pallof-press',
] as const;

const RETIRED_EXERCISE_SET = new Set<string>(RETIRED_EXERCISE_SLUGS);

export function isRetiredExerciseSlug(slug: string): boolean {
  return RETIRED_EXERCISE_SET.has(slug);
}

export function filterRetiredExercises<T extends { slug: string }>(items: T[]): T[] {
  return items.filter((item) => !isRetiredExerciseSlug(item.slug));
}

/**
 * O catálogo atual do Evolyn usa somente peso corporal. O campo de
 * equipamento continua legível para linhas antigas, mas nunca pode entrar em
 * catálogo, recomendação ou fila de treino.
 */
export function isBodyweightExercise(exercise: object): boolean {
  if (!('equipamento' in exercise)) return true;
  return exercise.equipamento == null || exercise.equipamento === '';
}

export function filterBodyweightExercises<T extends object>(items: T[]): T[] {
  return items.filter(isBodyweightExercise);
}

export function isPushUpExerciseSlug(slug: string): boolean {
  return slug === 'push-up' || slug.endsWith('-push-up');
}

/**
 * Compatibility for exercise rows created before laterality became explicit.
 * Seed definitions use these values too, but this keeps existing databases
 * behaviorally correct until their next catalog synchronization.
 */
const CANONICAL_LATERALITY: Readonly<Record<string, Exclude<ExerciseLaterality, 'none'>>> = {
  'bicycle-crunch': 'alternating',
  'flutter-kicks': 'alternating',
  'heel-touches': 'alternating',
  'mountain-climbers': 'alternating',
  'scissor-kicks': 'alternating',
  'single-leg-glute-bridge': 'per_side',
  'spiderman-plank': 'alternating',
  'windshield-wipers': 'alternating',
};

export function resolveExerciseLaterality(
  slug: string,
  persistedLaterality: unknown,
): ExerciseLaterality {
  const canonical = CANONICAL_LATERALITY[slug];
  if (canonical) return canonical;

  return ['none', 'per_side', 'alternating'].includes(String(persistedLaterality))
    ? (String(persistedLaterality) as ExerciseLaterality)
    : 'none';
}
