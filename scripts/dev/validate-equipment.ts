/**
 * Valida regras de equipamentos opcionais e exercícios gated.
 * Rode: npx tsx scripts/dev/validate-equipment.ts
 */
import assert from 'node:assert/strict';
import { equipmentExercises } from '../../server/src/db/seeds/equipment-exercises.ts';
import { allExercises } from '../../server/src/db/seeds/all-exercises.ts';
import {
  EQUIPMENT_CATALOG,
  isExerciseAvailableForUser,
  resolveUserEquipment,
  slugsUnlockedByEquipment,
} from '../../shared/equipment/index.ts';

let errors = 0;

for (const ex of equipmentExercises) {
  if (ex.ativo !== false) {
    console.error(`Equipment exercise ${ex.slug} must have ativo: false`);
    errors += 1;
  }
  if (!ex.equipamento) {
    console.error(`Equipment exercise ${ex.slug} missing equipamento`);
    errors += 1;
  }
}

const deadHang = equipmentExercises.find((e) => e.slug === 'dead-hang');
assert.ok(deadHang, 'dead-hang seed exists');
assert.equal(deadHang?.modo, 'tempo');
assert.equal(deadHang?.repeticoes_iniciante, 0);
assert.ok((deadHang?.tempo_seg_iniciante ?? 0) >= 30);
assert.ok((deadHang?.tempo_seg_avancado ?? 0) <= 60);

const withoutBar = { equipamentos: { push_up_board: true, ab_wheel: false, pull_up_bar: false } };
const withBar = { equipamentos: { pull_up_bar: true } };

assert.equal(isExerciseAvailableForUser({ ativo: false, equipamento: 'pull_up_bar' }, withoutBar), false);
assert.equal(isExerciseAvailableForUser({ ativo: false, equipamento: 'pull_up_bar' }, withBar), true);
assert.equal(isExerciseAvailableForUser({ ativo: true, equipamento: null }, withoutBar), true);

const unlocked = slugsUnlockedByEquipment(withBar);
assert.ok(unlocked.includes('dead-hang'), 'dead-hang unlocked with pull_up_bar');
assert.ok(!unlocked.includes('ab-wheel'), 'ab-wheel not unlocked without ab_wheel');

const allSlugs = new Set(allExercises.map((e) => e.slug));
for (const item of EQUIPMENT_CATALOG) {
  for (const slug of item.exerciseSlugs) {
    if (!allSlugs.has(slug)) {
      console.error(`Catalog slug missing from allExercises seed: ${slug}`);
      errors += 1;
    }
  }
}

assert.deepEqual(resolveUserEquipment(null), {
  push_up_board: false,
  pull_up_bar: false,
  ab_wheel: false,
  stability_ball: false,
});

if (errors > 0) {
  console.error(`Equipment validation failed (${errors} issues)`);
  process.exit(1);
}

console.log('Equipment validation OK');
