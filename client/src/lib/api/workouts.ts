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

export interface CompleteAtividadeResponse {
  user: import('@/types').IUserDocument;
  atividade: import('@shared/atividades').AtividadeExtra;
  xp_ganho: number;
  abdoria_ganha: number;
  /** true = hoje é dia de treino agendado; usado apenas para contexto visual. */
  dia_de_treino: boolean;
  atividades_hoje: number;
  /** Teto de atividades que ainda pagam XP no dia (não é mínimo pra streak). */
  atividades_minimo: number;
  streak_celebration: { streak_atual: number; streak_anterior: number } | null;
  level_up: { level_anterior: number; level_novo: number } | null;
  new_achievements: { id: string; titulo: string; descricao: string; icon: string }[];
}

/**
 * Conclui uma Atividade da fila do dia com as métricas do form contextual.
 * Em qualquer dia, uma conclusão sustenta a streak. As primeiras atividades
 * do dia concedem XP; depois do limite diário, passam a conceder Folhas.
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

/**
 * Preenche/corrige os dados de uma atividade já registrada. Serve pra quem
 * concluiu sem informar nada na hora e quer completar depois — não recalcula
 * XP, Folhas ou streak; altera somente o conteúdo do registro.
 */
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
