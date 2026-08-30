import type { ExerciseLaterality } from './types/index.js';

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
] as const;

const RETIRED_EXERCISE_SET = new Set<string>(RETIRED_EXERCISE_SLUGS);

export function isRetiredExerciseSlug(slug: string): boolean {
  return RETIRED_EXERCISE_SET.has(slug);
}

export function filterRetiredExercises<T extends { slug: string }>(items: T[]): T[] {
  return items.filter((item) => !isRetiredExerciseSlug(item.slug));
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
