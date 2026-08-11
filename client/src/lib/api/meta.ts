import type {
  AfkCombatSnapshot,
  AfkEnemyId,
  AfkPendingReward,
  AfkRegionId,
  ArmaPreferida,
  Inventario,
  IUserDocument,
  LevelUpCelebration,
  SlimeMaterialStockItem,
} from '@/types';
import { fetchJson } from './client';

export interface HealthResponse {
  status: string;
  database: 'connected' | 'disconnected';
  /** Mensagem real do erro de conexão, presente só quando `database` falha. */
  database_error?: string;
  timestamp: string;
}

export function getHealth(): Promise<HealthResponse> {
  return fetchJson('/health');
}

export interface AfkMetaResponse {
  minutos_acumulados: number;
  pending: AfkPendingReward;
  has_rewards: boolean;
  arma_preferida: ArmaPreferida;
  kill_drop_chance: number;
  kill_drop_chances?: { common: number; elite: number; boss: number };
  max_minutes: number;
  capped: boolean;
  combat: AfkCombatSnapshot;
  route_drink_count?: number;
  bestiario_novos?: AfkEnemyId[];
  /** true = personagem na vila (pausado); false = explorando de verdade. */
  paused?: boolean;
}

export interface InventarioSummary extends Inventario {
  frozen_streak: number;
  route_drink: number;
  bau_patrulha: number;
  exp_instant: number;
  doria_bag: number;
  stack_cap: number;
  materials: SlimeMaterialStockItem[];
}

export function getAfkMeta(): Promise<AfkMetaResponse> {
  return fetchJson('/meta/afk');
}

export function claimAfkRewards(): Promise<{
  user: IUserDocument;
  claimed: AfkPendingReward;
  discarded_items?: number;
  level_up?: LevelUpCelebration | null;
}> {
  return fetchJson('/meta/afk/claim', { method: 'POST' });
}

export interface AfkPingResponse {
  ok: boolean;
  minutos_acumulados: number;
  pending: AfkPendingReward;
  has_rewards: boolean;
  kill_drop_chance: number;
  kill_drop_chances?: { common: number; elite: number; boss: number };
  max_minutes: number;
  capped: boolean;
  combat: AfkCombatSnapshot;
  bestiario_novos?: AfkEnemyId[];
}

export function pingAfk(): Promise<AfkPingResponse> {
  return fetchJson('/meta/afk/ping', { method: 'POST' });
}

/** Vila pausa o tempo acumulado da Exploração; floresta ("exploring") retoma. */
export function setAfkScene(mode: 'village' | 'exploring'): Promise<AfkPingResponse> {
  return fetchJson('/meta/afk/scene', { method: 'POST', body: JSON.stringify({ mode }) });
}

export function setAfkAway(): Promise<AfkPingResponse> {
  return fetchJson('/meta/afk/away', { method: 'POST', keepalive: true });
}

export function startAfkAdventure(): Promise<AfkPingResponse> {
  return fetchJson('/meta/afk/adventure/start', { method: 'POST' });
}

export function recordAfkEnemyDefeat(expectedKillsTotal: number): Promise<AfkPingResponse> {
  return fetchJson('/meta/afk/combat/defeat', {
    method: 'POST',
    body: JSON.stringify({ expected_kills_total: expectedKillsTotal }),
  });
}

export function recordAfkEnemyHp(
  expectedKillsTotal: number,
  enemyId: AfkEnemyId,
  enemyHp: number,
): Promise<{ ok: true; saved: boolean }> {
  return fetchJson('/meta/afk/combat/enemy-hp', {
    method: 'PATCH',
    body: JSON.stringify({
      expected_kills_total: expectedKillsTotal,
      enemy_id: enemyId,
      enemy_hp: enemyHp,
    }),
    keepalive: true,
  });
}

export function selectAfkRegion(regionId: AfkRegionId): Promise<AfkPingResponse> {
  return fetchJson('/meta/afk/region', {
    method: 'POST',
    body: JSON.stringify({ region_id: regionId }),
  });
}

export function advanceAfkChapter(
  regionId: AfkRegionId,
): Promise<AfkPingResponse & { story: { title: string; body: string }; region_id: AfkRegionId }> {
  return fetchJson('/meta/afk/chapter/advance', {
    method: 'POST',
    body: JSON.stringify({ region_id: regionId }),
  });
}

export function recordAfkHeroState(
  expectedKillsTotal: number,
  enemyId: AfkEnemyId,
  heroHp: number,
  defeatedRemainingMs = 0,
): Promise<{ ok: true; saved: boolean }> {
  return fetchJson('/meta/afk/combat/hero-state', {
    method: 'PATCH',
    body: JSON.stringify({
      expected_kills_total: expectedKillsTotal,
      enemy_id: enemyId,
      hero_hp: heroHp,
      defeated_remaining_ms: defeatedRemainingMs,
    }),
    keepalive: true,
  });
}

export function unlockAfkSkill(nodeId: string): Promise<AfkPingResponse> {
  return fetchJson('/meta/afk/skill/unlock', {
    method: 'POST',
    body: JSON.stringify({ node_id: nodeId }),
  });
}

export function resetAfkSkillTree(
  currency: 'coins' | 'gems',
): Promise<AfkPingResponse & { user: IUserDocument; payment: 'free' | 'coins' | 'gems' }> {
  return fetchJson('/meta/afk/skill/reset', {
    method: 'POST',
    body: JSON.stringify({ currency }),
  });
}

export function markAfkStory(flag: string): Promise<{ ok: true }> {
  return fetchJson('/meta/afk/story', {
    method: 'POST',
    body: JSON.stringify({ flag }),
  });
}

export function getInventory(): Promise<InventarioSummary> {
  return fetchJson('/meta/inventory');
}

export function consumePatrolCache(): Promise<{
  user: IUserDocument;
  claimed: AfkPendingReward;
  inventario: InventarioSummary;
}> {
  return fetchJson('/meta/inventory/bau-patrulha', { method: 'POST' });
}

export function consumeRouteDrink(useAll = true): Promise<
  AfkMetaResponse & {
    user: IUserDocument;
    hours: number;
    quantity_used: number;
    claimed: AfkPendingReward;
    discarded_items?: number;
    inventario: InventarioSummary;
  }
> {
  return fetchJson('/meta/inventory/route-drink', {
    method: 'POST',
    body: JSON.stringify({ use_all: useAll }),
  });
}

export function consumeExpInstant(useAll = false): Promise<{
  user: IUserDocument;
  xp_ganho: number;
  quantity_used: number;
  inventario: InventarioSummary;
}> {
  return fetchJson('/meta/inventory/exp-instant', {
    method: 'POST',
    body: JSON.stringify(useAll ? { use_all: true } : {}),
  });
}

export function consumeDoriaBag(
  quantity = 1,
  useAll = false,
): Promise<{
  user: IUserDocument;
  abdoria_ganha: number;
  rolls: number[];
  quantity_used: number;
  inventario: InventarioSummary;
}> {
  return fetchJson('/meta/inventory/doria-bag', {
    method: 'POST',
    body: JSON.stringify(useAll ? { use_all: true } : { quantity }),
  });
}

export interface BestiaryDropEntry {
  id: string;
  label: string | null;
  chance: string;
  descoberto: boolean;
}

export interface BestiaryEntry {
  id: string;
  label: string;
  tier: 'common' | 'elite' | 'boss';
  max_hp: number;
  desbloqueado: boolean;
  drops: BestiaryDropEntry[];
  encounter_rate: string;
  regions: string[];
}

export interface BestiaryCategory {
  id: string;
  label: string;
  entries: BestiaryEntry[];
}

export interface BestiaryResponse {
  categorias: BestiaryCategory[];
  desbloqueados: string[];
  bonus_cap_diario: number;
  total_inimigos: number;
}

export function getBestiary(): Promise<BestiaryResponse> {
  return fetchJson('/meta/bestiary');
}

export function updateMetaPreferences(data: {
  ocultar_aviso_xp_diario?: boolean;
  arma_preferida?: ArmaPreferida;
}): Promise<IUserDocument> {
  return fetchJson('/meta/preferences', { method: 'PATCH', body: JSON.stringify(data) });
}
