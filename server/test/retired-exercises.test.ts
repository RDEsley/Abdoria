import { describe, expect, it } from 'vitest';
import {
  RETIRED_EXERCISE_SLUGS,
  filterRetiredExercises,
  isBodyweightExercise,
  isPushUpExerciseSlug,
} from '../../shared/exercises.js';
import { allExercises } from '../src/db/seeds/all-exercises.js';
import { workoutPresets } from '../src/db/seeds/workout-presets.js';

describe('política do catálogo de exercícios', () => {
  it('não publica exercícios retirados no seed principal', () => {
    const published = new Set(allExercises.map((exercise) => exercise.slug));
    for (const slug of RETIRED_EXERCISE_SLUGS) expect(published.has(slug)).toBe(false);
  });

  it('publica somente movimentos que não dependem de equipamento', () => {
    expect(allExercises.every(isBodyweightExercise)).toBe(true);
  });

  it('remove exercícios retirados de qualquer fila de preset', () => {
    const published = new Set(allExercises.map((exercise) => exercise.slug));
    for (const preset of workoutPresets) {
      expect(filterRetiredExercises(preset.exercicios)).toEqual(preset.exercicios);
      expect(preset.exercicios.every((exercise) => published.has(exercise.slug))).toBe(true);
      expect(preset.exercicios.length).toBeGreaterThan(0);
    }
  });

  it('identifica variações de flexão para a recomendação de iniciante', () => {
    expect(isPushUpExerciseSlug('push-up')).toBe(true);
    expect(isPushUpExerciseSlug('diamond-push-up')).toBe(true);
    expect(isPushUpExerciseSlug('plank')).toBe(false);
  });
});
