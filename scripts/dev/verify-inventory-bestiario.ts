import assert from 'node:assert/strict';
import { INVENTORY_STACK_CAP, dailyXpCapForUser } from '../../shared/types/index.js';
import {
  inferBestiaryDropsFromKill,
  snapshotBestiaryPending,
} from '../../shared/afk/bestiary-drops.js';

function simulateStackAdd(current: number, amount: number): { added: number; overflow: number; final: number } {
  const space = Math.max(0, INVENTORY_STACK_CAP - current);
  const added = Math.min(amount, space);
  const overflow = amount - added;
  return { added, overflow, final: current + added };
}

const energy = simulateStackAdd(22, 5);
assert.equal(energy.added, 2);
assert.equal(energy.overflow, 3);
assert.equal(energy.final, INVENTORY_STACK_CAP);

const route = simulateStackAdd(24, 1);
assert.equal(route.added, 0);
assert.equal(route.overflow, 1);

assert.equal(dailyXpCapForUser(5, 3), 108);

const empty = snapshotBestiaryPending({
  xp: 0,
  abdoria: 0,
  frozen_streaks: 0,
  route_drinks: 0,
  cosmetic_ids: [],
  weapon_ids: [],
  titulo_secreto: false,
});
const afterXp = snapshotBestiaryPending({
  xp: 1,
  abdoria: 0,
  frozen_streaks: 0,
  route_drinks: 0,
  cosmetic_ids: [],
  weapon_ids: [],
  titulo_secreto: false,
});
assert.deepEqual(inferBestiaryDropsFromKill('bat', empty, afterXp), ['xp']);

const afterGolden = snapshotBestiaryPending({
  xp: 0,
  abdoria: 99,
  frozen_streaks: 0,
  route_drinks: 1,
  cosmetic_ids: ['avatar_secreto'],
  weapon_ids: [],
  titulo_secreto: false,
});
assert.deepEqual(inferBestiaryDropsFromKill('golden_slime', empty, afterGolden), [
  'abdoria_golden',
  'cosmetic_secret',
  'route_drink',
]);

console.log('verify-inventory-bestiario: OK');
