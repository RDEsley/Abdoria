/**
 * Simula drops da Exploração AFK (mesma lógica do servidor).
 * Uso: npx tsx scripts/dev/simulate-afk-drops.ts
 */
import { COSMETICS } from '../../server/src/data/cosmetics.js';
import {
  advanceKillsUntilBoss,
  getEnemyMaxHp,
  resolveNextSpawn,
  shouldSpawnBoss,
} from '../../shared/afk/combat.js';
import { DEFAULT_AFK_COMBAT, type AfkCombatState, type AfkPendingReward } from '../../shared/types/index.js';
import {
  rollBossLegendaryWeapon,
  rollGoldenSlimeSecretCosmetic,
  rollKillDrop,
  rollRouteDrinkDrop,
} from '../../server/src/services/afk-rolls.js';
import { PATROL_LEGENDARY_WEAPON_IDS, PATROL_SECRET_WEAPON_IDS } from '../../shared/patrol/shop.js';
import {
  AFK_GOLDEN_SLIME_ABDORIA,
  AFK_KILLS_PER_MINUTE,
  AFK_ROUTE_DRINK_DROP_THRESHOLD,
  DORIA_BAG_MAX,
  DORIA_BAG_MIN,
  EXP_INSTANT_XP,
  GOLDEN_SLIME_SECRET_COSMETIC_IDS,
  isExplorationLegendaryCosmeticDrop,
} from '../../shared/types/index.js';

const USER_ID = 'sim-user-afk-drops';

type MockUser = {
  id: string;
  cosmeticos: { desbloqueados: string[] };
  preferencias: { patrol_armas: { desbloqueados: string[] } };
};

function emptyPending(): AfkPendingReward {
  return {
    xp: 0,
    abdoria: 0,
    frozen_streaks: 0,
    route_drinks: 0,
    cosmetic_ids: [],
    weapon_ids: [],
    exp_instant: 0,
    doria_bags: 0,
    titulo_secreto: false,
    drop_count: 0,
  };
}

function mockUser(unlockedCosmetics: string[] = [], unlockedWeapons: string[] = []): MockUser {
  return {
    id: USER_ID,
    cosmeticos: { desbloqueados: unlockedCosmetics },
    preferencias: { patrol_armas: { desbloqueados: unlockedWeapons } },
  };
}

function defeatEnemy(user: MockUser, combat: AfkCombatState, pending: AfkPendingReward): void {
  const defeatedEnemyId = combat.enemy_id;
  const wasBoss = combat.is_boss;
  const wasGolden = defeatedEnemyId === 'golden_slime';

  combat.kills_total += 1;
  combat.kills_until_boss = advanceKillsUntilBoss(combat.kills_until_boss, wasBoss);

  if (wasGolden) {
    pending.abdoria += AFK_GOLDEN_SLIME_ABDORIA;
    pending.drop_count = (pending.drop_count ?? 0) + 1;
    rollGoldenSlimeSecretCosmetic(user as never, combat.kills_total, pending);
  } else {
    const tier = wasBoss ? 'boss' : combat.elite ? 'elite' : 'common';
    rollKillDrop(user as never, combat.kills_total, pending, { bossBoost: wasBoss, tier });
    if (wasBoss) {
      rollBossLegendaryWeapon(
        user as never,
        combat.kills_total,
        pending,
        new Set(user.preferencias.patrol_armas.desbloqueados),
      );
    }
  }

  rollRouteDrinkDrop(user as never, combat.kills_total, pending);

  const picked = resolveNextSpawn(
    USER_ID,
    combat.kills_until_boss,
    combat.kills_total,
    combat.enemy_id,
  );
  combat.enemy_id = picked.enemy_id;
  combat.enemy_hp = getEnemyMaxHp(picked.enemy_id);
  combat.is_boss = picked.is_boss;
  combat.elite = picked.elite;
}

function simulateKills(kills: number, user: MockUser) {
  const combat: AfkCombatState = { ...DEFAULT_AFK_COMBAT };
  const pending = emptyPending();
  const tierKills = { common: 0, elite: 0, boss: 0, golden: 0 };

  for (let i = 0; i < kills; i += 1) {
    if (combat.enemy_id === 'golden_slime') tierKills.golden += 1;
    else if (combat.is_boss) tierKills.boss += 1;
    else if (combat.elite) tierKills.elite += 1;
    else tierKills.common += 1;

    defeatEnemy(user, combat, pending);
  }

  return { pending, tierKills, kills };
}

function hoursToKills(hours: number): number {
  return Math.floor(hours * 60 * AFK_KILLS_PER_MINUTE);
}

const EXPLORATION_LEGENDARY_POOL = COSMETICS.filter((c) => isExplorationLegendaryCosmeticDrop(c)).map(
  (c) => ({ id: c.id, nome: c.nome, kind: c.kind, raridade: c.raridade }),
);

const LEGENDARY_SHOP_COSMETICS = EXPLORATION_LEGENDARY_POOL.filter((c) => c.raridade === 'lendario');
const EPIC_SHOP_COSMETICS = EXPLORATION_LEGENDARY_POOL.filter((c) => c.raridade === 'epico');

const HOURS = [1, 6, 24] as const;
const userFresh = mockUser();

console.log('=== Simulação determinística (usuário sem cosméticos/armas lendárias) ===\n');

const results = HOURS.map((h) => {
  const kills = hoursToKills(h);
  const { pending, tierKills } = simulateKills(kills, userFresh);
  return { hours: h, kills, pending, tierKills };
});

for (const r of results) {
  console.log(`--- ${r.hours}h (${r.kills} kills) ---`);
  console.log(`  Inimigos: comum ${r.tierKills.common}, elite ${r.tierKills.elite}, boss ${r.tierKills.boss}, golden ${r.tierKills.golden}`);
  console.log(`  XP: ${r.pending.xp}`);
  console.log(`  Dorias (loot): ${r.pending.abdoria}`);
  console.log(`  Dorias (golden): ${r.tierKills.golden * AFK_GOLDEN_SLIME_ABDORIA}`);
  console.log(`  Frozen Streaks: ${r.pending.frozen_streaks}`);
  console.log(`  EXP Instantâneo: ${r.pending.exp_instant} (=${r.pending.exp_instant * EXP_INSTANT_XP} XP se usar)`);
  console.log(`  Bolsas de Dorias: ${r.pending.doria_bags} (${DORIA_BAG_MIN}-${DORIA_BAG_MAX} Dorias cada)`);
  console.log(`  Route Drinks (~${(AFK_ROUTE_DRINK_DROP_THRESHOLD / 10000 * r.kills).toFixed(1)} esperado em ${r.hours}h): ${r.pending.route_drinks}`);
  console.log(`  Cosméticos lendários: ${r.pending.cosmetic_ids.length}`, r.pending.cosmetic_ids);
  console.log(`  Cosméticos golden secret: ${r.pending.cosmetic_ids.filter((id) => GOLDEN_SLIME_SECRET_COSMETIC_IDS.includes(id as never)).length}`);
  console.log(`  Armas lendárias boss: ${r.pending.weapon_ids.filter((id) => PATROL_LEGENDARY_WEAPON_IDS.includes(id as never)).length}`, r.pending.weapon_ids.filter((id) => PATROL_LEGENDARY_WEAPON_IDS.includes(id as never)));
  console.log(`  Armas Secret: ${r.pending.weapon_ids.filter((id) => PATROL_SECRET_WEAPON_IDS.includes(id as never)).length}`, r.pending.weapon_ids.filter((id) => PATROL_SECRET_WEAPON_IDS.includes(id as never)));
  console.log(`  Título secreto: ${r.pending.titulo_secreto}`);
  console.log('');
}

console.log('=== Catálogo de drops possíveis ===\n');
console.log('Cosméticos lendários/epicos (Exploração, sem som/dono):', EXPLORATION_LEGENDARY_POOL.length);
console.log('  Lendários:', LEGENDARY_SHOP_COSMETICS.length);
LEGENDARY_SHOP_COSMETICS.forEach((c) => console.log(`    - ${c.nome} (${c.id}, ${c.kind})`));
console.log('  Épicos:', EPIC_SHOP_COSMETICS.length);
EPIC_SHOP_COSMETICS.forEach((c) => console.log(`    - ${c.nome} (${c.id}, ${c.kind})`));
console.log('\nGolden Slime secret:', [...GOLDEN_SLIME_SECRET_COSMETIC_IDS]);
console.log('Armas boss (lendárias):', [...PATROL_LEGENDARY_WEAPON_IDS]);
console.log('Armas Secret (Exploração):', [...PATROL_SECRET_WEAPON_IDS]);
console.log('Título secreto: titulo_secreto');
console.log('Route Drink, Energy Drink, EXP Instantâneo, Bolsa de Dorias, +1 XP, +1 Doria');
