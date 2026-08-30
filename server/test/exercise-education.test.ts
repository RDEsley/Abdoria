import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getExerciseEducationDefinition } from '../../shared/exercise-education.js';
import { isRetiredExerciseSlug, resolveExerciseLaterality } from '../../shared/exercises.js';
import { allExercises } from '../src/db/seeds/all-exercises.js';
import { workoutPresets } from '../src/db/seeds/workout-presets.js';

const catalogBySlug = new Map(allExercises.map((exercise) => [exercise.slug, exercise]));
const activeProgramSlugs = [
  ...new Set(
    workoutPresets
      .flatMap((preset) => preset.exercicios.map((exercise) => exercise.slug))
      .filter((slug) => !isRetiredExerciseSlug(slug)),
  ),
];

describe('catálogo educacional do programa', () => {
  it('possui definição completa para todo exercício ativo', () => {
    for (const slug of activeProgramSlugs) {
      const exercise = catalogBySlug.get(slug);
      const education = getExerciseEducationDefinition(slug);

      expect(exercise, `${slug}: ausente no catálogo canônico`).toBeTruthy();
      expect(education, `${slug}: sem conteúdo educacional`).toBeTruthy();
      expect(education?.nomePt.trim().length, `${slug}: sem nome em português`).toBeGreaterThan(2);
      expect(education?.summary.trim().length, `${slug}: resumo insuficiente`).toBeGreaterThan(12);
      expect(
        education?.steps.length,
        `${slug}: precisa ensinar posição, movimento e retorno`,
      ).toBeGreaterThanOrEqual(3);
      expect(education?.primaryMuscles.length, `${slug}: sem foco muscular`).toBeGreaterThan(0);
      expect(education?.breathing, `${slug}: sem orientação de respiração`).toBeTruthy();
      expect(education?.safety, `${slug}: sem fallback de segurança`).toBeTruthy();
    }
  });

  it('aponta toda mídia para um asset interno existente', () => {
    for (const slug of activeProgramSlugs) {
      const exercise = catalogBySlug.get(slug);
      expect(exercise, `${slug}: ausente no catálogo`).toBeTruthy();
      if (!exercise) continue;
      const mediaPath = resolve(
        process.cwd(),
        '../client/public/media/exercises',
        exercise.media.gif,
      );
      expect(existsSync(mediaPath), `${slug}: mídia ausente em ${exercise.media.gif}`).toBe(true);
    }
  });

  it('declara corretamente os exercícios unilaterais', () => {
    for (const slug of ['side-plank', 'copenhagen-plank', 'single-leg-glute-bridge']) {
      expect(catalogBySlug.get(slug)?.laterality, `${slug}: lateralidade incorreta`).toBe(
        'per_side',
      );
    }
  });
});

describe('compatibilidade de metadados legados', () => {
  it.each([
    ['bicycle-crunch', 'alternating'],
    ['flutter-kicks', 'alternating'],
    ['heel-touches', 'alternating'],
    ['mountain-climbers', 'alternating'],
    ['scissor-kicks', 'alternating'],
    ['single-leg-glute-bridge', 'per_side'],
    ['spiderman-plank', 'alternating'],
    ['windshield-wipers', 'alternating'],
  ] as const)('normaliza %s mesmo quando a linha persistida é antiga', (slug, expected) => {
    expect(resolveExerciseLaterality(slug, 'none')).toBe(expected);
  });
});
