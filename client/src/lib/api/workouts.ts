import type {
  CompleteWorkoutPayload,
  CompleteWorkoutResponse,
  DashboardStats,
  IWorkoutHistoryDocument,
  IWorkoutPresetDocument,
  TreinoBase,
  TreinoSugerido,
} from '@/types';
import { fetchJson } from './client';

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
  ciclo?: TreinoBase;
}): Promise<TreinoSugerido> {
  const params = new URLSearchParams();
  if (options?.allowRepeats) params.set('allowRepeats', 'true');
  if (options?.shuffle === false) params.set('shuffle', 'false');
  if (options?.extra) params.set('extra', String(options.extra));
  if (options?.excludePresetId) params.set('excludePresetId', options.excludePresetId);
  if (options?.ciclo) params.set('ciclo', options.ciclo);
  const q = params.toString();
  return fetchJson(`/presets/recommend${q ? `?${q}` : ''}`);
}

export function getPreset(id: string): Promise<IWorkoutPresetDocument> {
  return fetchJson(`/presets/${id}`);
}
