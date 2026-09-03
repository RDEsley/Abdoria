import { fetchJson } from './client';

export interface QuestStatus {
  id: string;
  scope: 'daily' | 'weekly';
  title: string;
  description: string;
  goal: number;
  xp: number;
  progress: number;
  claimed: boolean;
}

export function listQuests(): Promise<QuestStatus[]> {
  return fetchJson('/quests');
}

export function claimQuest(
  id: string,
): Promise<{ user: import('@/types').IUserDocument; xp_ganho: number }> {
  return fetchJson(`/quests/${id}/claim`, { method: 'POST' });
}
