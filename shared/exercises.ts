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
