import type { UserRecord } from '../domain/User.js';
import { COSMETICS } from '../data/cosmetics.js';
import {
  PATROL_MYTHIC_WEAPON_IDS,
  PATROL_SECRET_WEAPON_IDS,
  PATROL_SPELL_IDS,
  SPELL_DUPLICATE_DORIAS,
  resolvePatrolArmas,
  spellRareDropMultiplier,
  spellRewardQuantityMultiplier,
} from '../../../shared/patrol/shop.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import type { AfkEnemyId, AfkEnemyTier } from '../types/index.js';
import {
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_ROUTE_DRINK_DROP_THRESHOLD,
  AFK_SECRET_ROLL_EXACT,
  AFK_SECRET_WEAPON_GATE_MOD,
  GOLDEN_SLIME_SECRET_COSMETIC_IDS,
  getSlimeMaterialForEnemy,
  isExplorationLegendaryCosmeticDrop,
  type AfkPendingReward,
} from '../types/index.js';

export function hashKillSeed(userId: string, killIndex: number): number {
  let h = 2166136261;
  const s = `${userId}:${killIndex}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** @deprecated use hashKillSeed */
export const hashIntervalSeed = hashKillSeed;

function pickLegendaryCosmeticId(user: UserRecord, killIndex: number): string | null {
  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  const candidates = COSMETICS.filter(
    (c) => !unlocked.has(c.id) && isExplorationLegendaryCosmeticDrop(c),
  );
  if (candidates.length === 0) return null;
  const idx = hashKillSeed(String(user.id), killIndex) % candidates.length;
  return candidates[idx]?.id ?? null;
}

export interface RollLootOptions {
  bossBoost?: boolean;
  tier?: AfkEnemyTier;
  chapter?: number;
  bossId?: AfkEnemyId;
  skillDropBonusPct?: number;
}

export function getKillDropChanceForTier(
  tier: AfkEnemyTier,
  chapter = 1,
  skillBonusPct = 0,
): number {
  const base =
    tier === 'boss'
      ? AFK_KILL_DROP_CHANCE_BOSS
      : tier === 'elite'
        ? AFK_KILL_DROP_CHANCE_ELITE
        : AFK_KILL_DROP_CHANCE_COMMON;
  return base + Math.max(0, chapter - 1) * 0.015 + Math.max(0, skillBonusPct);
}

/**
 * Janela base do drop de arma Mítica por boss: 0,05% (500 em 1.000.000).
 * Mais raro que o cosmético Lendário do boss (0,07%): ~2.000 bosses ≈ 200.000
 * kills ≈ 416h de exploração até a 1ª Mítica (era 0,13%/~160h quando o nível 9
 * ainda era Lendário). A rolagem usa espaço /1e6 pra passiva de magia
 * (1.05x–1.15x) ter granularidade real.
 */
const BOSS_MYTHIC_WEAPON_WINDOW_PER_MILLION = 500;

/** Arco Dracônico / Espada Flamejante (nível 9, Míticas) — só de bosses. */
export function rollBossMythicWeapon(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  unlockedWeaponIds: Set<string>,
): void {
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const window = Math.round(
    BOSS_MYTHIC_WEAPON_WINDOW_PER_MILLION * spellRareDropMultiplier(armas.magia_equipada),
  );
  const roll = hashKillSeed(String(user.id), killIndex + 9001) % 1_000_000;
  if (roll >= window) return;

  const candidates = PATROL_MYTHIC_WEAPON_IDS.filter((id: string) => !unlockedWeaponIds.has(id));
  if (candidates.length === 0) return;

  const idx = hashKillSeed(String(user.id), killIndex + 9002) % candidates.length;
  const weaponId = candidates[idx];
  if (!weaponId || pending.weapon_ids.includes(weaponId)) return;

  pending.weapon_ids.push(weaponId);
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}

/** @deprecated As armas de nível 9 viraram Míticas — use {@link rollBossMythicWeapon}. */
export const rollBossLegendaryWeapon = rollBossMythicWeapon;

/** Arma Secret (nv. 10) — roll 9998 + portão 1/3 (~0,0033% na tabela vs 0,01% do título). */
function rollSecretPatrolWeapon(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  unlockedWeaponIds: Set<string>,
): void {
  const gate = hashKillSeed(String(user.id), killIndex + 8001) % AFK_SECRET_WEAPON_GATE_MOD;
  if (gate !== 0) return;

  const candidates = PATROL_SECRET_WEAPON_IDS.filter(
    (id) => !unlockedWeaponIds.has(id) && !pending.weapon_ids.includes(id),
  );
  if (candidates.length === 0) return;

  const idx = hashKillSeed(String(user.id), killIndex + 8002) % candidates.length;
  const weaponId = candidates[idx];
  if (!weaponId) return;

  pending.weapon_ids.push(weaponId);
}

/** XP/Coins básicos — passiva da magia Secret dá 9% de chance de +1 extra. */
function grantBasicLoot(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  kind: 'xp' | 'abdoria',
  quantityMultiplier: number,
): void {
  const bonusChance = Math.round((quantityMultiplier - 1) * 100);
  const extra =
    bonusChance > 0 && hashKillSeed(String(user.id), killIndex + 3001) % 100 < bonusChance ? 1 : 0;
  if (kind === 'xp') pending.xp += 1 + extra;
  else pending.abdoria += 1 + extra;
}

function rollPercent(userId: string, killIndex: number, salt: number, chancePct: number): boolean {
  return hashKillSeed(userId, killIndex + salt) % 10_000 < Math.round(chancePct * 100);
}

/**
 * Uma rolagem na tabela de loot da exploração, por tier do inimigo:
 * comum = XP/Coins/Bolsa/EXP Instantâneo; elite = XP/Coins;
 * boss = XP/Coins + janelas raras (lendário/secret).
 * Frozen Streak é exclusivamente diário e limitado a uma unidade.
 */
export function rollLootTable(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): boolean {
  const tier = opts?.tier ?? (opts?.bossBoost ? 'boss' : 'common');
  const chapter = Math.max(1, opts?.chapter ?? 1);
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const rareMult = spellRareDropMultiplier(armas.magia_equipada);
  const qtyMult = spellRewardQuantityMultiplier(armas.magia_equipada);
  const userId = String(user.id);
  let dropped = false;

  if (tier === 'boss') {
    // Cada entrada tem uma rolagem própria: em uma vitória extremamente
    // sortuda, recursos, cosmético, título e arma podem aparecer juntos.
    if (chapter >= 5 && rollPercent(userId, killIndex, 4001, 0.01 * rareMult)) {
      pending.titulo_secreto = true;
      dropped = true;
    }
    if (chapter >= 5 && rollPercent(userId, killIndex, 4002, 0.01 * rareMult)) {
      const before = pending.weapon_ids.length;
      rollSecretPatrolWeapon(user, killIndex, pending, new Set(armas.desbloqueados));
      dropped ||= pending.weapon_ids.length > before;
    }
    if (rollPercent(userId, killIndex, 4003, 0.07 * rareMult)) {
      const cosmeticId = pickLegendaryCosmeticId(user, killIndex);
      if (cosmeticId && !pending.cosmetic_ids.includes(cosmeticId)) {
        pending.cosmetic_ids.push(cosmeticId);
        dropped = true;
      }
    }
    if (rollPercent(userId, killIndex, 4010, 15)) {
      grantBasicLoot(user, killIndex, pending, 'abdoria', qtyMult);
      dropped = true;
    }
    if (rollPercent(userId, killIndex, 4011, 85)) {
      grantBasicLoot(user, killIndex, pending, 'xp', qtyMult);
      dropped = true;
    }
    return dropped;
  }

  const xpChance = tier === 'elite' ? 88 : 85;
  const coinChance = tier === 'elite' ? 12 : 15;
  if (rollPercent(userId, killIndex, 4101, xpChance)) {
    grantBasicLoot(user, killIndex, pending, 'xp', qtyMult);
    dropped = true;
  }
  if (rollPercent(userId, killIndex, 4102, coinChance)) {
    grantBasicLoot(user, killIndex, pending, 'abdoria', qtyMult);
    dropped = true;
  }
  if (tier === 'elite') return dropped;

  if (rollPercent(userId, killIndex, 4104, 2)) {
    pending.doria_bags = (pending.doria_bags ?? 0) + 1;
    dropped = true;
  }
  if (rollPercent(userId, killIndex, 4105, 5)) {
    pending.exp_instant = (pending.exp_instant ?? 0) + 1;
    dropped = true;
  }
  return dropped;
}

/** Drop secreto do Golden Slime — mesma chance do título secreto (roll exato 9999). */
export function rollGoldenSlimeSecretCosmetic(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const roll = hashKillSeed(String(user.id), killIndex + 7777) % 10000;
  if (roll !== AFK_SECRET_ROLL_EXACT) return;

  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  const ownedPending = new Set(pending.cosmetic_ids);
  const candidates = GOLDEN_SLIME_SECRET_COSMETIC_IDS.filter(
    (id: string) => !unlocked.has(id) && !ownedPending.has(id),
  );
  if (candidates.length === 0) return;

  const idx = hashKillSeed(String(user.id), killIndex + 7778) % candidates.length;
  const cosmeticId = candidates[idx];
  if (!cosmeticId) return;

  pending.cosmetic_ids.push(cosmeticId);
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}

/** Coins + Bolsas de Coins dados a cada kill repetida de "?"/Slime Binário depois
    do drop secreto já ter sido conquistado — pra a kill continuar valendo a pena. */
/** Drop do inimigo especial "?" (1 em 100.000): título único "???????". */
export function rollEnigmaDrop(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const titleId = 'titulo_enigma';
  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  if (unlocked.has(titleId) || pending.cosmetic_ids.includes(titleId)) {
    return;
  }
  if (hashKillSeed(String(user.id), killIndex + 9101) % 100 >= 5) return;
  pending.cosmetic_ids.push(titleId);
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}

/** Drop do Slime Binário (1 em 101.010): borda + título únicos, juntos na 1ª derrota. */
export function rollBinarioDrop(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const borderId = 'borda_binario';
  const titleId = 'titulo_codigo_evolucao';
  const unlocked = new Set(user.cosmeticos?.desbloqueados ?? []);
  const alreadyOwned =
    unlocked.has(borderId) ||
    unlocked.has(titleId) ||
    pending.cosmetic_ids.includes(borderId) ||
    pending.cosmetic_ids.includes(titleId);
  if (alreadyOwned) {
    return;
  }
  if (hashKillSeed(String(user.id), killIndex + 9201) % 100 >= 5) return;
  pending.cosmetic_ids.push(borderId, titleId);
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}

// Escala ×4 dos pesos antigos, pra caber Raio Laser (3) e Explosão (1) abaixo
// do Buraco Negro (8) mantendo pesos inteiros.
function spellDropWeight(id: string): number {
  if (id === 'magia_agua') return 180;
  if (id === 'magia_terra') return 80;
  if (id === 'magia_gelo') return 64;
  if (id === 'magia_fogo') return 44;
  if (id === 'magia_relampago') return 24;
  if (id === 'magia_buraco_negro') return 8;
  if (id === 'magia_raio_laser') return 3;
  if (id === 'magia_explosao') return 1;
  return 4;
}

/**
 * Peso do "sem drop" — quanto mais raras as magias restantes, menor a chance
 * diária. 220 (vs 160 na escala antiga) deixa magias mais difíceis no geral:
 * ~65% de chance no dia com a coleção vazia (era ~71%).
 */
/**
 * Drop do Slime Mágico. Regras:
 * - Cada magia só é conquistada uma vez: o pool nunca inclui magias já possuídas
 *   (nem já pendentes no baú) — progressão real rumo à coleção completa.
 * - Cada encontro realiza uma rolagem independente de 25%; a raridade define
 *   apenas qual magia sai quando a rolagem acerta.
 * - Coleção completa: todo drop de magia vira SPELL_DUPLICATE_DORIAS automaticamente.
 */
export function rollMagicRabbitSpell(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  skillBonusPct = 0,
): void {
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const unlockedSpells = new Set(armas.desbloqueados);

  const spellsNotOwned = (PATROL_SPELL_IDS as readonly string[]).filter(
    (id) => !unlockedSpells.has(id) && !pending.weapon_ids.includes(id),
  );

  if (spellsNotOwned.length === 0) {
    pending.abdoria += SPELL_DUPLICATE_DORIAS;
    pending.drop_count = (pending.drop_count ?? 0) + 1;
    return;
  }

  // 25% por Slime Mágico; a árvore soma pequenos pontos percentuais.
  const chancePerTenThousand = Math.round((25 + Math.max(0, skillBonusPct)) * 100);
  if (hashKillSeed(String(user.id), killIndex + 6665) % 10_000 >= chancePerTenThousand) return;
  const weights = spellsNotOwned.map(spellDropWeight);
  const totalSpellWeight = weights.reduce((a, b) => a + b, 0);
  const roll = hashKillSeed(String(user.id), killIndex + 6666) % totalSpellWeight;

  let cumulative = 0;
  for (let i = 0; i < spellsNotOwned.length; i++) {
    cumulative += weights[i] ?? 0;
    if (roll < cumulative) {
      const spellId = spellsNotOwned[i];
      if (spellId) {
        pending.weapon_ids.push(spellId);
        pending.drop_count = (pending.drop_count ?? 0) + 1;
        armas.ultimo_drop_magia = getTodaySaoPaulo();
        user.preferencias.patrol_armas = armas;
      }
      return;
    }
  }
}

/** @deprecated use rollKillDrop */
export function rollIntervalReward(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  rollLootTable(user, killIndex, pending, opts);
}

/**
 * Route Drink: roll % 10.000 < {@link AFK_ROUTE_DRINK_DROP_THRESHOLD}.
 * Só roda em kills de Elite (e do Golden Slime) — ver afk-combat.
 */
export function rollRouteDrinkDrop(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
): void {
  const proc = hashKillSeed(String(user.id), killIndex + 5041) % 10000;
  if (proc >= AFK_ROUTE_DRINK_DROP_THRESHOLD) return;
  pending.route_drinks += 1;
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}

/** Chance de drop por kill conforme tier; se acertar, usa a tabela de raridade. */
export function rollKillDrop(
  user: UserRecord,
  killIndex: number,
  pending: AfkPendingReward,
  opts?: RollLootOptions,
): void {
  const tier = opts?.tier ?? 'common';
  const threshold = getKillDropChanceForTier(tier, opts?.chapter, opts?.skillDropBonusPct);
  const proc = hashKillSeed(String(user.id), killIndex) % 100_000;
  if (proc >= Math.round(threshold * 1000)) return;
  if (rollLootTable(user, killIndex, pending, opts)) {
    pending.drop_count = (pending.drop_count ?? 0) + 1;
  }
}

/** Material exclusivo de cada espécie. A rolagem é independente da tabela
 * principal, portanto pode vir junto de XP, Coins, consumíveis e armas. */
export function rollSlimeMaterialDrop(
  user: UserRecord,
  enemyId: AfkEnemyId,
  killIndex: number,
  pending: AfkPendingReward,
): boolean {
  const material = getSlimeMaterialForEnemy(enemyId);
  const roll = hashKillSeed(`${user.id}:${enemyId}:material`, killIndex + 12_001) % 10_000;
  if (roll >= Math.round(material.dropChancePct * 100)) return false;

  pending.material_items ??= {};
  pending.material_items[material.id] = (pending.material_items[material.id] ?? 0) + 1;
  pending.drop_count = (pending.drop_count ?? 0) + 1;
  return true;
}

const BOSS_SIGNATURE_WEAPONS: Partial<Record<AfkEnemyId, string>> = {
  boss_colossus: 'arco_04',
  boss_crocodile: 'espada_05',
  boss_lich: 'espada_04',
  boss_golem: 'arco_07',
  boss_procrastinador: 'arco_09',
  boss_preguica: 'espada_09',
};

/** Cada guardião possui uma arma temática própria, com chance legível e repetível. */
export function rollBossSignatureWeapon(
  user: UserRecord,
  bossId: AfkEnemyId,
  killIndex: number,
  pending: AfkPendingReward,
  chapter: number,
): void {
  const weaponId = BOSS_SIGNATURE_WEAPONS[bossId];
  if (!weaponId) return;
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  if (armas.desbloqueados.includes(weaponId) || pending.weapon_ids.includes(weaponId)) return;

  const chancePct = Math.max(5, 13 - chapter * 1.25);
  const roll = hashKillSeed(String(user.id), killIndex + 9300 + chapter) % 10_000;
  if (roll >= Math.round(chancePct * 100)) return;
  pending.weapon_ids.push(weaponId);
  pending.drop_count = (pending.drop_count ?? 0) + 1;
}
