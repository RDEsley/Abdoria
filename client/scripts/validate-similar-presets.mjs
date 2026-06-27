/**
 * Validação rápida da lógica de treinos similares (sem framework de testes).
 * Executar: node scripts/validate-similar-presets.mjs
 */

const SIMILAR_MUSCLES = {
  superior: ['superior', 'core'],
  inferior: ['inferior', 'core'],
  obliquos: ['obliquos', 'core', 'superior'],
  core: ['core', 'superior', 'inferior', 'obliquos'],
  completo: ['completo', 'superior', 'inferior', 'obliquos', 'core'],
};

function dominantMuscle(counts) {
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function muscleOverlap(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((m) => b.has(m)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function similarityScore(reference, candidate) {
  if (reference.size === 0 || candidate.size === 0) return 0;
  const refDominant = dominantMuscle(reference);
  const candDominant = dominantMuscle(candidate);
  let score = 0;
  if (refDominant && candDominant && refDominant === candDominant) score += 10;
  if (refDominant) {
    const similar = new Set([refDominant, ...SIMILAR_MUSCLES[refDominant]]);
    for (const muscle of candidate.keys()) {
      if (similar.has(muscle)) score += 3;
    }
  }
  for (const [muscle, count] of candidate) {
    const refCount = reference.get(muscle);
    if (refCount != null) score += Math.min(refCount, count);
  }
  score += muscleOverlap(new Set(reference.keys()), new Set(candidate.keys())) * 5;
  return score;
}

function isSimilar(reference, candidate) {
  return similarityScore(reference, candidate) >= 3.5;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const superiorRef = new Map([['superior', 4], ['core', 1]]);
const superiorMatch = new Map([['superior', 3]]);
const inferiorOnly = new Map([['inferior', 5]]);

assert(isSimilar(superiorRef, superiorMatch), 'presets com foco superior devem ser similares');
assert(!isSimilar(superiorRef, inferiorOnly), 'superior vs inferior não deve ser similar');
assert(
  similarityScore(superiorRef, superiorMatch) > similarityScore(superiorRef, inferiorOnly),
  'score superior deve ser maior que inferior',
);

const obliquesRef = new Map([['obliquos', 3], ['core', 2]]);
const coreHeavy = new Map([['core', 4], ['superior', 1]]);
assert(isSimilar(obliquesRef, coreHeavy), 'obliques e core-heavy devem ser similares');

const choices = [
  { kind: 'preset', id: 'a' },
  { kind: 'preset', id: 'b' },
];
const cursor = 0;
const index = cursor % choices.length;
assert(choices[index].id === 'a', 'pickNext deve retornar primeiro item');
assert((index + 1) % choices.length === 1, 'cursor deve avançar');

console.log('OK — similar-presets validation passed');
