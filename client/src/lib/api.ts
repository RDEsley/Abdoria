import type {
  AfkCombatSnapshot,
  AfkEnemyId,
  AfkPendingReward,
  ArmaPreferida,
  AuthResponse,
  CompleteWorkoutPayload,
  CompleteWorkoutResponse,
  CosmeticKind,
  CosmeticsResponse,
  DashboardStats,
  EquipCosmeticResponse,
  Inventario,
  LojaDiaria,
  LojaDiariaSlot,
  RedeemCodeResponse,
  ShopResponse,
  ExerciseFilters,
  IExerciseDocument,
  IUserDocument,
  IWorkoutHistoryDocument,
  IWorkoutPresetDocument,
  LeaderboardEntry,
  LeaderboardMetric,
  OnboardingPayload,
  PatrolShopResponse,
  MusculoPrincipal,
  UpdateUserDadosResponse,
  UserDadosSalvos,
} from '@/types';
import { LEADERBOARD_DISPLAY_LIMIT } from '@/types';
import { getToken, clearToken } from '@/lib/auth-storage';
import { ApiError, mapHttpStatus, toApiError } from '@/lib/api-errors';

const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 20_000;

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('abdoria:unauthorized'));
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const serverMessage = (body as { error?: string }).error;
      throw mapHttpStatus(response.status, serverMessage);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    throw toApiError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return fetchJson('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function loginAsGuest(): Promise<AuthResponse> {
  return fetchJson('/auth/guest', { method: 'POST' });
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return fetchJson('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export function register(email: string, password: string, nome: string): Promise<AuthResponse> {
  return fetchJson('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, nome }) });
}

export function logoutApi(): Promise<{ ok: boolean }> {
  return fetchJson('/auth/logout', { method: 'POST' });
}

export function getExercises(filters: ExerciseFilters = {}): Promise<IExerciseDocument[]> {
  const params = new URLSearchParams();
  if (filters.musculo) params.set('musculo', filters.musculo);
  if (filters.nivel !== undefined) params.set('nivel', String(filters.nivel));
  if (filters.prioridade) params.set('prioridade', filters.prioridade);
  const query = params.toString();
  return fetchJson(`/exercises${query ? `?${query}` : ''}`);
}

export function getMe(): Promise<IUserDocument> {
  return fetchJson('/users/me');
}

export function updateMe(data: Partial<IUserDocument>): Promise<IUserDocument> {
  return fetchJson('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
}

export function updateUserDados(data: Partial<UserDadosSalvos>): Promise<UpdateUserDadosResponse> {
  return fetchJson('/users/me/dados', { method: 'PATCH', body: JSON.stringify(data) });
}

export function completeOnboarding(data: OnboardingPayload): Promise<IUserDocument> {
  return fetchJson('/users/me/onboarding', { method: 'PATCH', body: JSON.stringify(data) });
}

export function getDashboardStats(): Promise<DashboardStats> {
  return fetchJson('/workouts/stats');
}

export function getDashboardRecommendations(): Promise<
  Pick<DashboardStats, 'treino_sugerido' | 'alertas_recomendacao' | 'proximo_treino'>
> {
  return fetchJson('/workouts/stats/recommendations');
}

export function getWorkoutHistory(): Promise<IWorkoutHistoryDocument[]> {
  return fetchJson('/workouts/history');
}

export function completeWorkout(payload: CompleteWorkoutPayload): Promise<CompleteWorkoutResponse> {
  return fetchJson('/workouts/complete', { method: 'POST', body: JSON.stringify(payload) });
}

export function getPresets(): Promise<IWorkoutPresetDocument[]> {
  return fetchJson('/presets');
}

export function getRecommendedPresets(): Promise<IWorkoutPresetDocument[]> {
  return fetchJson('/presets/recommended');
}

export function getRecommendWorkout(options?: {
  allowRepeats?: boolean;
  shuffle?: boolean;
  extra?: number;
  excludePresetId?: string | null;
  ciclo?: import('@/types').TreinoBase;
}): Promise<import('@/types').TreinoSugerido> {
  const params = new URLSearchParams();
  if (options?.allowRepeats) params.set('allowRepeats', 'true');
  if (options?.shuffle === false) params.set('shuffle', 'false');
  if (options?.extra) params.set('extra', String(options.extra));
  if (options?.excludePresetId) params.set('excludePresetId', options.excludePresetId);
  if (options?.ciclo) params.set('ciclo', options.ciclo);
  const q = params.toString();
  return fetchJson(`/presets/recommend${q ? `?${q}` : ''}`);
}

export interface SimilarExercisesResponse {
  reference: {
    slug: string;
    musculo_principal: string;
    modo: string;
    prioridade?: string;
  } | null;
  similares: Array<{
    slug: string;
    nome: string;
    musculo_principal: string;
    modo: string;
    prioridade?: string;
    score: number;
  }>;
}

export function getSimilarExercises(
  slug: string,
  queueSlugs: string[] = [],
): Promise<SimilarExercisesResponse> {
  const params = new URLSearchParams({ slug });
  if (queueSlugs.length > 0) params.set('queueSlugs', queueSlugs.join(','));
  return fetchJson(`/exercises/similar?${params.toString()}`);
}

export function getPreset(id: string): Promise<IWorkoutPresetDocument> {
  return fetchJson(`/presets/${id}`);
}

export function getLeaderboard(metric: LeaderboardMetric = 'xp'): Promise<LeaderboardEntry[]> {
  return fetchJson(`/leaderboard?metric=${metric}&limit=${LEADERBOARD_DISPLAY_LIMIT}`);
}

export function getMyLeaderboardRank(metric: LeaderboardMetric = 'xp'): Promise<LeaderboardEntry> {
  return fetchJson(`/leaderboard/me?metric=${metric}`);
}

export function getCosmetics(): Promise<CosmeticsResponse> {
  return fetchJson('/shop');
}

export function getShop(): Promise<ShopResponse> {
  return fetchJson('/shop');
}

export function purchaseShopItem(id: string): Promise<{ user: IUserDocument; abdoria_gasta?: number }> {
  return fetchJson('/shop/purchase', { method: 'POST', body: JSON.stringify({ id }) });
}

export function purchaseCosmetic(id: string): Promise<{ user: IUserDocument; moedas_gastas?: number }> {
  return purchaseShopItem(id);
}

export function equipShopItem(kind: CosmeticKind, id: string): Promise<EquipCosmeticResponse> {
  return fetchJson('/shop/equip', { method: 'PATCH', body: JSON.stringify({ kind, id }) });
}

export function equipCosmetic(kind: CosmeticKind, id: string): Promise<{ user: IUserDocument }> {
  return equipShopItem(kind, id);
}

export function claimDailyShopSlot(slot: number): Promise<{
  user: IUserDocument;
  loja_diaria: LojaDiaria;
  overflow_to_dorias?: number;
}> {
  return fetchJson('/shop/daily/claim', { method: 'POST', body: JSON.stringify({ slot }) });
}

export function claimFreeDailyShopRewards(): Promise<{
  user: IUserDocument;
  claimed: LojaDiariaSlot[];
  loja_diaria: LojaDiaria;
  overflow_to_dorias?: number;
}> {
  return fetchJson('/shop/daily/claim-free', { method: 'POST', body: '{}' });
}

export function redeemGiftCode(code: string): Promise<RedeemCodeResponse> {
  return fetchJson('/shop/redeem-code', { method: 'POST', body: JSON.stringify({ code }) });
}

export interface HealthResponse {
  status: string;
  database: 'connected' | 'disconnected';
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

export function usePatrolCache(): Promise<{
  user: IUserDocument;
  claimed: AfkPendingReward;
  inventario: InventarioSummary;
}> {
  return fetchJson('/meta/inventory/bau-patrulha', { method: 'POST' });
}

export function useRouteDrink(): Promise<AfkMetaResponse & {
  user: IUserDocument;
  hours: number;
  claimed: AfkPendingReward;
  overflow_to_dorias?: number;
  inventario: InventarioSummary;
}> {
  return fetchJson('/meta/inventory/route-drink', { method: 'POST' });
}

export function useExpInstant(useAll = false): Promise<{
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

export function useDoriaBag(quantity = 1): Promise<{
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
  id: 'common' | 'elite' | 'boss';
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
  coletar_loja_diaria_automatico?: boolean;
  arma_preferida?: ArmaPreferida;
}): Promise<IUserDocument> {
  return fetchJson('/meta/preferences', { method: 'PATCH', body: JSON.stringify(data) });
}

export function getPatrolShop(): Promise<PatrolShopResponse> {
  return fetchJson('/patrol-shop');
}

export function purchasePatrolWeapon(id: string): Promise<{
  user: IUserDocument;
  abdoria_gasta: number;
}> {
  return fetchJson('/patrol-shop/purchase', { method: 'POST', body: JSON.stringify({ id }) });
}

export function equipPatrolWeapon(
  kind: 'arco' | 'espada',
  id: string,
): Promise<{ user: IUserDocument }> {
  return fetchJson('/patrol-shop/equip', { method: 'PATCH', body: JSON.stringify({ kind, id }) });
}

export type { MusculoPrincipal, ApiError };
