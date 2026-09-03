import type {
  CompleteWorkoutPayload,
  CompleteWorkoutResponse,
  DashboardStats,
  IUserDocument,
  IWorkoutHistoryDocument,
  IWorkoutPresetDocument,
  TreinoBase,
  TreinoSugerido,
} from '@/types';
import { fetchJson } from './client';

export function getDashboardStats(): Promise<DashboardStats> {
  return fetchJson('/workouts/stats');
}

/** Paga a oferta ativa de "Recuperar Streak" (ver DashboardStats.streak_recovery_offer). */
export function recoverStreak(): Promise<{ user: IUserDocument; streak_atual: number }> {
  return fetchJson('/workouts/streak/recover', { method: 'POST' });
}

/** Usa Folhas para igualar a sequência atual ao recorde pessoal. */
export function matchStreakRecord(): Promise<{ user: IUserDocument; streak_atual: number }> {
  return fetchJson('/workouts/streak/match-record', { method: 'POST' });
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

export function getRecommendWorkout(options?: {
  allowRepeats?: boolean;
  shuffle?: boolean;
  extra?: number;
  excludePresetId?: string | null;
  ciclo?: TreinoBase;
  dia?: number;
}): Promise<TreinoSugerido> {
  const params = new URLSearchParams();
  if (options?.allowRepeats) params.set('allowRepeats', 'true');
  if (options?.shuffle === false) params.set('shuffle', 'false');
  if (options?.extra) params.set('extra', String(options.extra));
  if (options?.excludePresetId) params.set('excludePresetId', options.excludePresetId);
  if (options?.ciclo) params.set('ciclo', options.ciclo);
  if (options?.dia != null) params.set('dia', String(options.dia));
  const q = params.toString();
  return fetchJson(`/presets/recommend${q ? `?${q}` : ''}`);
}
