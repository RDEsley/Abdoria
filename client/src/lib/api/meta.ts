import type {
  AfkCombatSnapshot,
  AfkEnemyId,
  AfkPendingReward,
  ArmaPreferida,
  Inventario,
  IUserDocument,
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
}

export interface InventarioSummary extends Inventario {
  frozen_streak: number;
  route_drink: number;
  bau_patrulha: number;
  exp_instant: number;
  doria_bag: number;
  stack_cap: number;
}

export function getAfkMeta(): Promise<AfkMetaResponse> {
  return fetchJson('/meta/afk');
}

export function claimAfkRewards(): Promise<{
  user: IUserDocument;
  claimed: AfkPendingReward;
  overflow_to_dorias?: number;
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
    overflow_to_dorias?: number;
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

export function consumeDoriaBag(quantity = 1): Promise<{
  user: IUserDocument;
  abdoria_ganha: number;
  rolls: number[];
  quantity_used: number;
  inventario: InventarioSummary;
}> {
  return fetchJson('/meta/inventory/doria-bag', {
    method: 'POST',
    body: JSON.stringify({ quantity }),
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
