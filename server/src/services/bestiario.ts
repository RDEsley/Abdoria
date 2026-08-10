import type { UserRecord } from '../domain/User.js';
import {
  ALL_BESTIARY_ENEMY_IDS,
  BESTIARY_CATEGORIES,
  AFK_ENEMIES,
  XP_DAILY_CAP_PER_BESTIARY,
  CURRENCY_NAME,
  AFK_REGIONS,
  AFK_GOLDEN_SLIME_CHANCE,
  AFK_MAGIC_RABBIT_CHANCE,
  AFK_ENIGMA_CHANCE,
  AFK_BINARIO_CHANCE,
  getEnemyMaxHp,
  isBestiaryEnemyId,
  bestiaryDropsForEnemy,
  buildBestiaryDropCatalog,
  inferBestiaryDropsFromKill,
  mergeBestiaryDropDiscoveries,
  migrateBestiaryDropId,
  getSlimeMaterialForEnemy,
  type AfkEnemyId,
  type BestiaryDropId,
  type BestiaryPendingSnapshot,
} from '../types/index.js';

export function ensureBestiario(user: UserRecord): AfkEnemyId[] {
  if (!Array.isArray(user.gamificacao.bestiario_desbloqueados)) {
    user.gamificacao.bestiario_desbloqueados = [];
  }
  user.gamificacao.bestiario_desbloqueados = user.gamificacao.bestiario_desbloqueados.filter(
    (id): id is AfkEnemyId => isBestiaryEnemyId(String(id)),
  );
  return user.gamificacao.bestiario_desbloqueados;
}

export function countBestiaryUnlocks(user: UserRecord): number {
  return ensureBestiario(user).length;
}

export function bestiaryDailyCapBonus(user: UserRecord): number {
  return countBestiaryUnlocks(user) * XP_DAILY_CAP_PER_BESTIARY;
}

/** Registra primeira vitória contra um inimigo. Retorna true se foi desbloqueio novo. */
export function unlockBestiaryEnemy(user: UserRecord, enemyId: AfkEnemyId): boolean {
  if (!isBestiaryEnemyId(enemyId)) return false;
  const unlocked = ensureBestiario(user);
  if (unlocked.includes(enemyId)) return false;
  unlocked.push(enemyId);
  return true;
}

function ensureBestiaryDropDiscoveries(user: UserRecord) {
  if (
    !user.gamificacao.bestiario_drops_descobertos ||
    typeof user.gamificacao.bestiario_drops_descobertos !== 'object'
  ) {
    user.gamificacao.bestiario_drops_descobertos = {};
  }
  return user.gamificacao.bestiario_drops_descobertos;
}

export function recordBestiaryDropDiscoveries(
  user: UserRecord,
  enemyId: AfkEnemyId,
  dropIds: BestiaryDropId[],
): void {
  if (!isBestiaryEnemyId(enemyId) || dropIds.length === 0) return;
  const current = ensureBestiaryDropDiscoveries(user);
  user.gamificacao.bestiario_drops_descobertos = mergeBestiaryDropDiscoveries(
    current,
    enemyId,
    dropIds,
  );
}

export function recordBestiaryKillDrops(
  user: UserRecord,
  enemyId: AfkEnemyId,
  before: BestiaryPendingSnapshot,
  after: BestiaryPendingSnapshot,
): void {
  const dropIds = inferBestiaryDropsFromKill(enemyId, before, after);
  recordBestiaryDropDiscoveries(user, enemyId, dropIds);
}

export interface BestiaryDropEntryResponse {
  id: BestiaryDropId;
  label: string | null;
  chance: string;
  descoberto: boolean;
}

export interface BestiaryEntryResponse {
  id: AfkEnemyId;
  label: string;
  tier: 'common' | 'elite' | 'boss';
  max_hp: number;
  desbloqueado: boolean;
  drops: BestiaryDropEntryResponse[];
  encounter_rate: string;
  regions: string[];
}

export interface BestiaryCategoryResponse {
  id: string;
  label: string;
  entries: BestiaryEntryResponse[];
}

export function readBestiaryResponse(user: UserRecord): {
  categorias: BestiaryCategoryResponse[];
  desbloqueados: AfkEnemyId[];
  bonus_cap_diario: number;
  total_inimigos: number;
} {
  const unlocked = new Set(ensureBestiario(user));
  const dropCatalog = buildBestiaryDropCatalog(CURRENCY_NAME);
  const discoveries = ensureBestiaryDropDiscoveries(user);
  const encounterRate = (id: AfkEnemyId): string => {
    if (id === 'golden_slime') return `1 em ${AFK_GOLDEN_SLIME_CHANCE.toLocaleString('pt-BR')}`;
    if (id === 'magic_rabbit') return `1 em ${AFK_MAGIC_RABBIT_CHANCE.toLocaleString('pt-BR')}`;
    if (id === 'slime_enigma') return `1 em ${AFK_ENIGMA_CHANCE.toLocaleString('pt-BR')}`;
    if (id === 'slime_binario') return `1 em ${AFK_BINARIO_CHANCE.toLocaleString('pt-BR')}`;
    const bossRegion = AFK_REGIONS.find((region) => region.bossId === id);
    if (bossRegion) return `Após ${bossRegion.killsToBoss} vitórias`;
    return AFK_ENEMIES[id].tier === 'elite' ? 'aprox. 1 em 8' : 'aprox. 1 em 5';
  };
  const categorias: BestiaryCategoryResponse[] = BESTIARY_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    entries: category.enemyIds.map((id) => {
      const def = AFK_ENEMIES[id];
      const discovered = new Set((discoveries[id] ?? []).map(migrateBestiaryDropId));
      const material = getSlimeMaterialForEnemy(id);
      const regions = AFK_REGIONS.filter(
        (region) =>
          region.bossId === id ||
          region.commonEnemies.includes(id) ||
          region.eliteEnemies.includes(id),
      );
      return {
        id,
        label: def.label,
        tier: def.tier,
        max_hp: getEnemyMaxHp(id, regions[0]?.chapter ?? 1),
        desbloqueado: unlocked.has(id),
        drops: bestiaryDropsForEnemy(id).map((dropId) => ({
          id: dropId,
          label: discovered.has(dropId)
            ? dropId === 'material_unique'
              ? material.name
              : dropCatalog[dropId].label
            : null,
          chance:
            dropId === 'material_unique'
              ? `${material.dropChancePct}%`
              : dropCatalog[dropId].chance,
          descoberto: discovered.has(dropId),
        })),
        encounter_rate: encounterRate(id),
        regions: regions.length > 0 ? regions.map((region) => region.name) : ['Todas as regiões'],
      };
    }),
  }));

  return {
    categorias,
    desbloqueados: [...unlocked],
    bonus_cap_diario: unlocked.size * XP_DAILY_CAP_PER_BESTIARY,
    total_inimigos: ALL_BESTIARY_ENEMY_IDS.length,
  };
}
