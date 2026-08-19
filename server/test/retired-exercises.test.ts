import { describe, expect, it } from 'vitest';
import {
  RETIRED_EXERCISE_SLUGS,
  filterRetiredExercises,
  isPushUpExerciseSlug,
} from '../../shared/exercises.js';
import { allExercises } from '../src/db/seeds/all-exercises.js';
import { workoutPresets } from '../src/db/seeds/workout-presets.js';

describe('política do catálogo de exercícios', () => {
  it('não publica exercícios retirados no seed principal', () => {
    const published = new Set(allExercises.map((exercise) => exercise.slug));
    for (const slug of RETIRED_EXERCISE_SLUGS) expect(published.has(slug)).toBe(false);
  });

  it('remove exercícios retirados de qualquer fila de preset', () => {
    for (const preset of workoutPresets) {
      const filtered = filterRetiredExercises(preset.exercicios);
      expect(
        filtered.every((exercise) => !RETIRED_EXERCISE_SLUGS.includes(exercise.slug as never)),
      ).toBe(true);
    }
  });

  it('identifica variações de flexão para a recomendação de iniciante', () => {
    expect(isPushUpExerciseSlug('push-up')).toBe(true);
    expect(isPushUpExerciseSlug('diamond-push-up')).toBe(true);
    expect(isPushUpExerciseSlug('plank')).toBe(false);
  });
});
