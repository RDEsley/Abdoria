import { fetchJson } from './client';
import type { ActivityLogRecord, ActivityRecord, RoutineRecord } from '@shared/activities';

export function listActivities(): Promise<ActivityRecord[]> {
  return fetchJson('/activities');
}

export function createActivity(body: Record<string, unknown>): Promise<ActivityRecord> {
  return fetchJson('/activities', { method: 'POST', body: JSON.stringify(body) });
}

export function updateActivity(id: string, body: Record<string, unknown>): Promise<ActivityRecord> {
  return fetchJson(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function archiveActivity(id: string): Promise<ActivityRecord> {
  return fetchJson(`/activities/${id}`, { method: 'DELETE' });
}

export interface CompleteActivityResponse {
  duplicate: boolean;
  log: ActivityLogRecord;
  user: import('@/types').IUserDocument;
  xp_ganho: number;
  abdoria_ganha: number;
  streak_celebration: { streak_atual: number; streak_anterior: number } | null;
  level_up: { level_anterior: number; level_novo: number } | null;
  new_achievements: string[];
  routine_bonus_xp: number;
  first_of_day?: boolean;
}

export function completeActivity(
  id: string,
  body: {
    client_completion_id: string;
    kind?: 'full' | 'minimum';
    metrics?: Record<string, unknown>;
    note?: string;
    occurrence_key?: string;
    routine_id?: string;
    duration_min?: number;
    value?: number;
  },
): Promise<CompleteActivityResponse> {
  return fetchJson(`/activities/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listActivityLogs(from?: string, to?: string): Promise<ActivityLogRecord[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return fetchJson(`/activity-logs${query ? `?${query}` : ''}`);
}

export function updateActivityLog(
  id: string,
  body: Record<string, unknown>,
): Promise<ActivityLogRecord> {
  return fetchJson(`/activity-logs/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function listRoutines(): Promise<RoutineRecord[]> {
  return fetchJson('/routines');
}

export function createRoutine(body: Record<string, unknown>): Promise<RoutineRecord> {
  return fetchJson('/routines', { method: 'POST', body: JSON.stringify(body) });
}

export function updateRoutine(id: string, body: Record<string, unknown>): Promise<RoutineRecord> {
  return fetchJson(`/routines/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function archiveRoutine(id: string): Promise<RoutineRecord> {
  return fetchJson(`/routines/${id}`, { method: 'DELETE' });
}
