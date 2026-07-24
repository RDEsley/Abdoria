/**
 * Valida catálogo de armas, dano/crítico e drops de boss.
 * Rode: npx tsx scripts/dev/verify-patrol-weapons.ts
 */
import assert from 'node:assert/strict';
import {
  AFK_CRIT_CHANCE_ARCO,
  AFK_CRIT_CHANCE_ESPADA,
  AFK_CRIT_STREAK_STEP_ARCO,
  AFK_GOLDEN_SLIME_MOEDA_BONUS,
  AFK_GOLDEN_SLIME_CHANCE,
  shouldSpawnGoldenSlime,
} from '../../shared/afk/combat.ts';
import {
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
} from '../../shared/types/index.ts';
import {
  PATROL_MYTHIC_WEAPON_IDS,
  PATROL_WEAPONS,
  patrolHeroDamage,
  patrolWeaponsByKind,
  spellRareDropMultiplier,
  spellRewardQuantityMultiplier,
} from '../../shared/patrol/shop.ts';
import {
  resolvePatrolAttackDamage,
  resolvePatrolBaseDamage,
  resolvePatrolCritChancePercent,
  isPatrolHitKillTarget,
} from '../../shared/patrol/damage.ts';
import { rollBossMythicWeapon } from '../../server/src/services/afk-rolls.ts';
import { EMPTY_AFK_PENDING } from '../../server/src/repositories/user-repository.ts';
import type { UserRecord } from '../../server/src/types/user-record.ts';

assert.equal(AFK_CRIT_CHANCE_ARCO, 18);
assert.equal(AFK_CRIT_CHANCE_ESPADA, 6);
assert.equal(AFK_CRIT_STREAK_STEP_ARCO, 4);
assert.equal(AFK_GOLDEN_SLIME_CHANCE, 5000);
assert.equal(AFK_GOLDEN_SLIME_MOEDA_BONUS, 99);

assert.equal(patrolWeaponsByKind('arco').length, 10);
assert.equal(patrolWeaponsByKind('espada').length, 10);
assert.equal(patrolWeaponsByKind('magia').length, 8);
assert.equal(PATROL_WEAPONS.length, 28);

const arco1 = PATROL_WEAPONS.find((w) => w.id === 'arco_01')!;
const espada1 = PATROL_WEAPONS.find((w) => w.id === 'espada_01')!;
assert.equal(arco1.dano_base, 10);
assert.equal(espada1.dano_base, 12);
assert.equal(arco1.unlock.tipo, 'gratis');
assert.equal(espada1.unlock.tipo, 'gratis');

const arco2 = PATROL_WEAPONS.find((w) => w.id === 'arco_02')!;
const espada2 = PATROL_WEAPONS.find((w) => w.id === 'espada_02')!;
assert.equal(arco2.unlock.tipo === 'moedas' && arco2.unlock.preco_moedas, 665);
assert.equal(espada2.unlock.tipo === 'moedas' && espada2.unlock.preco_moedas, 800);

const arco10 = PATROL_WEAPONS.find((w) => w.id === 'arco_10')!;
const espada10 = PATROL_WEAPONS.find((w) => w.id === 'espada_10')!;
assert.equal(arco10.raridade, 'secreto');
assert.equal(espada10.raridade, 'secreto');

// Nível 9 é Mítico (Arco Dracônico + Espada Flamejante, ex-Lâmina do Dragão).
const arco9 = PATROL_WEAPONS.find((w) => w.id === 'arco_09')!;
const espada9 = PATROL_WEAPONS.find((w) => w.id === 'espada_09')!;
assert.equal(arco9.raridade, 'mitico');
assert.equal(espada9.raridade, 'mitico');
assert.equal(espada9.nome, 'Espada Flamejante');

// Magias: -14 de dano base em troca da passiva de drops raros (épico+).
const spellDamage = Object.fromEntries(
  patrolWeaponsByKind('magia').map((w) => [w.id, w.dano_base]),
);
assert.deepEqual(spellDamage, {
  magia_agua: 14,
  magia_terra: 18,
  magia_gelo: 22,
  magia_fogo: 28,
  magia_relampago: 34,
  magia_buraco_negro: 46,
  magia_raio_laser: 54,
  magia_explosao: 66,
});
assert.equal(spellRareDropMultiplier('magia_agua'), 1);
assert.equal(spellRareDropMultiplier('magia_gelo'), 1);
assert.equal(spellRareDropMultiplier('magia_fogo'), 1.05);
assert.equal(spellRareDropMultiplier('magia_buraco_negro'), 1.05);
assert.equal(spellRareDropMultiplier('magia_raio_laser'), 1.08);
assert.equal(spellRareDropMultiplier('magia_explosao'), 1.15);
assert.equal(spellRewardQuantityMultiplier('magia_raio_laser'), 1);
assert.equal(spellRewardQuantityMultiplier('magia_explosao'), 1.09);
assert.equal(spellRareDropMultiplier('arco_09'), 1, 'passiva é exclusiva de magia');

const raioLaser = PATROL_WEAPONS.find((w) => w.id === 'magia_raio_laser')!;
const explosao = PATROL_WEAPONS.find((w) => w.id === 'magia_explosao')!;
assert.equal(raioLaser.raridade, 'mitico');
assert.equal(explosao.raridade, 'secreto');

assert.equal(patrolHeroDamage('arco', 'arco_05'), 24);
assert.equal(patrolHeroDamage('espada', 'espada_09'), 50);

assert.equal(resolvePatrolBaseDamage('arco', 'arco_10', 'bat'), 90);
assert.ok(isPatrolHitKillTarget('bat'));
assert.equal(resolvePatrolBaseDamage('arco', 'arco_10', 'armored_skeleton'), 52);
assert.equal(resolvePatrolBaseDamage('espada', 'espada_10', 'golden_slime'), 60);
assert.equal(resolvePatrolCritChancePercent('arco', 'arco_10', 'boss_colossus'), 35);
assert.equal(resolvePatrolCritChancePercent('espada', 'espada_10', 'boss_colossus'), 16);

let streak = 0;
const crit1 = resolvePatrolAttackDamage({
  kind: 'arco',
  weaponId: 'arco_03',
  enemyId: 'bat',
  critStreak: streak,
  isCrit: true,
});
assert.equal(crit1.damage, 18 + 4);
assert.equal(crit1.nextCritStreak, 1);

streak = crit1.nextCritStreak;
const crit2 = resolvePatrolAttackDamage({
  kind: 'arco',
  weaponId: 'arco_03',
  enemyId: 'bat',
  critStreak: streak,
  isCrit: true,
});
assert.equal(crit2.damage, 18 + 8);
assert.equal(crit2.nextCritStreak, 2);

const miss = resolvePatrolAttackDamage({
  kind: 'arco',
  weaponId: 'arco_03',
  enemyId: 'bat',
  critStreak: 2,
  isCrit: false,
});
assert.equal(miss.nextCritStreak, 0);

const swordCrit = resolvePatrolAttackDamage({
  kind: 'espada',
  weaponId: 'espada_03',
  enemyId: 'bat',
  critStreak: 5,
  isCrit: true,
});
assert.equal(swordCrit.damage, 20 + 25);
assert.equal(swordCrit.nextCritStreak, 0);

let goldenHits = 0;
for (let seed = 0; seed < 50_000; seed += 1) {
  if (shouldSpawnGoldenSlime(seed)) goldenHits += 1;
}
assert.equal(goldenHits, 10, 'golden slime 1/5000 over 50k seeds');

const mockUser = { id: 'boss-drop-test', preferencias: {} } as UserRecord;
let weaponDrops = 0;
const mythicSamples = 200_000;
for (let i = 0; i < mythicSamples; i += 1) {
  const pending = { ...EMPTY_AFK_PENDING, weapon_ids: [] as string[] };
  rollBossMythicWeapon(mockUser, i, pending, new Set());
  if (pending.weapon_ids.length > 0) weaponDrops += 1;
}
assert.ok(
  weaponDrops >= 50 && weaponDrops <= 170,
  `boss mythic drop ~0.05% (got ${weaponDrops}/${mythicSamples})`,
);
assert.deepEqual([...PATROL_MYTHIC_WEAPON_IDS], ['arco_09', 'espada_09']);

console.log('Patrol weapons verification OK');
console.log(
  JSON.stringify(
    {
      drop_proc_common_pct: AFK_KILL_DROP_CHANCE_COMMON,
      drop_proc_elite_pct: AFK_KILL_DROP_CHANCE_ELITE,
      drop_proc_boss_pct: AFK_KILL_DROP_CHANCE_BOSS,
      boss_mythic_drop_pct: 0.05,
      boss_mythic_hours_to_first: Math.round((1 / 0.0005) * (100 / 8 / 60)),
      golden_slime_chance: `1/${AFK_GOLDEN_SLIME_CHANCE}`,
      golden_slime_abdoria: AFK_GOLDEN_SLIME_MOEDA_BONUS,
      bow_crit_pct: AFK_CRIT_CHANCE_ARCO,
      sword_crit_pct: AFK_CRIT_CHANCE_ESPADA,
      bow_crit_streak_step: AFK_CRIT_STREAK_STEP_ARCO,
    },
    null,
    2,
  ),
);
