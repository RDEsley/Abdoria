/**
 * Valida similaridade entre exercícios.
 * Rode: npx tsx scripts/dev/validate-similar-exercises.ts
 */
import assert from 'node:assert/strict';
import {
  filterSimilarExercises,
  pickPresetForCycle,
  scoreExerciseSimilarity,
} from '../../shared/similar-exercises.ts';

const plank = {
  slug: 'plank',
  musculo_principal: 'core' as const,
  modo: 'tempo' as const,
  prioridade: 'isometrico',
};

const crunch = {
  slug: 'crunch',
  musculo_principal: 'core' as const,
  modo: 'reps' as const,
  prioridade: 'A',
};

const pushUp = {
  slug: 'push-up',
  musculo_principal: 'superior' as const,
  modo: 'reps' as const,
  prioridade: 'A',
};

assert.ok(scoreExerciseSimilarity(plank, { ...plank, slug: 'side-plank' }) >= 8);
assert.ok(scoreExerciseSimilarity(plank, pushUp) < 8);

const similares = filterSimilarExercises(plank, [crunch, pushUp, { ...plank, slug: 'side-plank' }], {
  minScore: 8,
});
assert.ok(similares.some((s) => s.slug === 'side-plank'));
assert.ok(!similares.some((s) => s.slug === 'push-up'));

const presets = [
  { id: '1', ciclo_id: 'A', nivel: 'iniciante', objetivo: 'definicao', recomendado: true },
  { id: '2', ciclo_id: 'B', nivel: 'iniciante', objetivo: 'definicao', recomendado: true },
];
assert.equal(pickPresetForCycle(presets, 'A', 'iniciante', 'definicao')?.id, '1');
assert.equal(pickPresetForCycle(presets, 'C')?.id, undefined);

console.log('OK — similar-exercises validation passed');
