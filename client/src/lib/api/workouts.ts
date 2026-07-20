import type {
  CompleteWorkoutPayload,
  CompleteWorkoutResponse,
  DashboardStats,
  IWorkoutHistoryDocument,
  IWorkoutPresetDocument,
  TreinoBase,
  TreinoSugerido,
  WorkoutHistoryFeedCursor,
  WorkoutHistoryFeedPage,
  WorkoutHistorySessionDetail,
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

export function getWorkoutHistoryFeed(options?: {
  cursor?: WorkoutHistoryFeedCursor | null;
  limit?: number;
}): Promise<WorkoutHistoryFeedPage> {
  const params = new URLSearchParams();
  if (options?.cursor) {
    params.set('cursor', options.cursor.concluido_em);
    params.set('cursorId', options.cursor.id);
  }
  if (options?.limit) params.set('limit', String(options.limit));
  const q = params.toString();
  return fetchJson(`/workouts/history/feed${q ? `?${q}` : ''}`);
}

export function getWorkoutHistorySessionDetail(id: string): Promise<WorkoutHistorySessionDetail> {
  return fetchJson(`/workouts/history/${id}`);
}

export interface CompleteAtividadeResponse {
  user: import('@/types').IUserDocument;
  atividade: import('@shared/atividades').AtividadeExtra;
  xp_ganho: number;
  abdoria_ganha: number;
  /** true = hoje é dia de treino agendado — atividade ainda paga XP (até o teto diário), mas não mexe na streak. */
  dia_de_treino: boolean;
  atividades_hoje: number;
  atividades_minimo: number;
  /** true = bateu o mínimo de atividades do dia de descanso. */
  meta_descanso_atingida: boolean;
  streak_celebration: { streak_atual: number; streak_anterior: number } | null;
  level_up: { level_anterior: number; level_novo: number } | null;
  new_achievements: { id: string; titulo: string; descricao: string; icon: string }[];
}

/**
 * Conclui uma Atividade da fila do dia com as métricas do form contextual.
 * Dia de descanso paga XP e sustenta a streak (a partir do mínimo do dia);
 * dia de treino registra só pro calendário/conquistas.
 */
export function completeAtividade(
  atividadeId: string,
  payload: { metricas: Record<string, number | string>; obs?: string },
): Promise<CompleteAtividadeResponse> {
  return fetchJson('/workouts/atividade/complete', {
    method: 'POST',
    body: JSON.stringify({
      atividade_id: atividadeId,
      metricas: payload.metricas,
      ...(payload.obs ? { obs: payload.obs } : {}),
    }),
  });
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

export function getPreset(id: string): Promise<IWorkoutPresetDocument> {
  return fetchJson(`/presets/${id}`);
}
