/**
 * Valida a detecção/ponte do Frozen Streak (cobre exatamente 1 dia perdido).
 * Rode: npx tsx scripts/dev/verify-streak-freeze.ts
 */
import assert from 'node:assert/strict';
import {
  computeStreakWithFrozenDays,
  findStreakMissedDayForFreeze,
  type StreakWorkoutDay,
} from '../../shared/streak/protection.ts';
import { addDaysSaoPaulo, getTodaySaoPaulo } from '../../shared/utils/timezone.ts';

const today = getTodaySaoPaulo();
const d1 = addDaysSaoPaulo(today, -1); // ontem
const d2 = addDaysSaoPaulo(today, -2); // anteontem
const d3 = addDaysSaoPaulo(today, -3);

/** Constrói um treino cujo dia (SP) é exatamente `dayKey`. */
const workout = (dayKey: string): StreakWorkoutDay => ({ concluido_em: `${dayKey}T12:00:00Z` });

// 1) Treinou anteontem, faltou ontem, abriu hoje SEM treinar → cobre ontem.
assert.equal(
  findStreakMissedDayForFreeze([workout(d2)], []),
  d1,
  'volta sem treino: cobre ontem',
);

// 2) PONTE: treinou anteontem, faltou ontem, treinou hoje → ainda cobre ontem.
assert.equal(
  findStreakMissedDayForFreeze([workout(d2), workout(today)], []),
  d1,
  'ponte com treino hoje: cobre ontem',
);

// 3) Treinou ontem → nada a congelar.
assert.equal(findStreakMissedDayForFreeze([workout(d1)], []), null, 'treinou ontem: sem freeze');

// 4) Dois dias perdidos (último treino há 3 dias) → fora do alcance do freeze.
assert.equal(findStreakMissedDayForFreeze([workout(d3)], []), null, '2 dias perdidos: sem freeze');

// 5) Ontem já congelado → não consome de novo.
assert.equal(findStreakMissedDayForFreeze([workout(d2)], [d1]), null, 'ontem já congelado: sem freeze');

// 6) Guarda do consumo: o freeze precisa ESTENDER a ofensiva (caso ponte).
const hist = [workout(d2), workout(today)];
const semFreeze = computeStreakWithFrozenDays(hist, []);
const comFreeze = computeStreakWithFrozenDays(hist, [d1]);
assert.equal(semFreeze.atual, 1, 'sem freeze: corrente cai para 1 (só hoje)');
assert.equal(comFreeze.atual, 2, 'com freeze: ponte preserva anteontem→hoje = 2');
assert.ok(comFreeze.atual > semFreeze.atual, 'freeze estende a ofensiva');

console.log('Streak freeze verification OK');
