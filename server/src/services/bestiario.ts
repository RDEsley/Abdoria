import type { UserDocument } from '../domain/User.js';
import {
  ALL_BESTIARY_ENEMY_IDS,
  BESTIARY_CATEGORIES,
  AFK_ENEMIES,
  XP_DAILY_CAP_PER_BESTIARY,
  CURRENCY_NAME,
  isBestiaryEnemyId,
  bestiaryDropsForEnemy,
  buildBestiaryDropCatalog,
  inferBestiaryDropsFromKill,
  mergeBestiaryDropDiscoveries,
  snapshotBestiaryPending,
  type AfkEnemyId,
  type BestiaryDropId,
  type BestiaryPendingSnapshot,
} from '../types/index.js';

export function ensureBestiario(user: UserDocument): AfkEnemyId[] {
  if (!Array.isArray(user.gamificacao.bestiario_desbloqueados)) {
    user.gamificacao.bestiario_desbloqueados = [];
  }
  user.gamificacao.bestiario_desbloqueados = user.gamificacao.bestiario_desbloqueados.filter(
    (id): id is AfkEnemyId => isBestiaryEnemyId(String(id)),
  );
  return user.gamificacao.bestiario_desbloqueados;
}

export function countBestiaryUnlocks(user: UserDocument): number {
  return ensureBestiario(user).length;
}

export function bestiaryDailyCapBonus(user: UserDocument): number {
  return countBestiaryUnlocks(user) * XP_DAILY_CAP_PER_BESTIARY;
}

/** Registra primeira vitória contra um inimigo. Retorna true se foi desbloqueio novo. */
export function unlockBestiaryEnemy(user: UserDocument, enemyId: AfkEnemyId): boolean {
  if (!isBestiaryEnemyId(enemyId)) return false;
  const unlocked = ensureBestiario(user);
  if (unlocked.includes(enemyId)) return false;
  unlocked.push(enemyId);
  return true;
}

function ensureBestiaryDropDiscoveries(user: UserDocument) {
  if (!user.gamificacao.bestiario_drops_descobertos || typeof user.gamificacao.bestiario_drops_descobertos !== 'object') {
    user.gamificacao.bestiario_drops_descobertos = {};
  }
  return user.gamificacao.bestiario_drops_descobertos;
}

export function recordBestiaryDropDiscoveries(
  user: UserDocument,
  enemyId: AfkEnemyId,
  dropIds: BestiaryDropId[],
): void {
  if (!isBestiaryEnemyId(enemyId) || dropIds.length === 0) return;
  const current = ensureBestiaryDropDiscoveries(user);
  user.gamificacao.bestiario_drops_descobertos = mergeBestiaryDropDiscoveries(current, enemyId, dropIds);
}

export function recordBestiaryKillDrops(
  user: UserDocument,
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
}

export interface BestiaryCategoryResponse {
  id: 'common' | 'elite' | 'boss';
  label: string;
  entries: BestiaryEntryResponse[];
}

export function readBestiaryResponse(user: UserDocument): {
  categorias: BestiaryCategoryResponse[];
  desbloqueados: AfkEnemyId[];
  bonus_cap_diario: number;
  total_inimigos: number;
} {
  const unlocked = new Set(ensureBestiario(user));
  const dropCatalog = buildBestiaryDropCatalog(CURRENCY_NAME);
  const discoveries = ensureBestiaryDropDiscoveries(user);
  const categorias: BestiaryCategoryResponse[] = BESTIARY_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    entries: category.enemyIds.map((id) => {
      const def = AFK_ENEMIES[id];
      const discovered = new Set(discoveries[id] ?? []);
      return {
        id,
        label: def.label,
        tier: def.tier,
        max_hp: def.maxHp,
        desbloqueado: unlocked.has(id),
        drops: bestiaryDropsForEnemy(id).map((dropId) => ({
          id: dropId,
          label: discovered.has(dropId) ? dropCatalog[dropId].label : null,
          chance: dropCatalog[dropId].chance,
          descoberto: discovered.has(dropId),
        })),
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
