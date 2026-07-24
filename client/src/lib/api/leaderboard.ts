import type { LeaderboardEntry, LeaderboardMetric, LeaderboardPeriod } from '@/types';
import { LEADERBOARD_DISPLAY_LIMIT } from '@/types';
import { fetchJson } from './client';

export function getLeaderboard(
  metric: LeaderboardMetric = 'xp',
  period: LeaderboardPeriod = 'semanal',
): Promise<LeaderboardEntry[]> {
  return fetchJson(
    `/leaderboard?metric=${metric}&period=${period}&limit=${LEADERBOARD_DISPLAY_LIMIT}`,
  );
}

export function getMyLeaderboardRank(
  metric: LeaderboardMetric = 'xp',
  period: LeaderboardPeriod = 'semanal',
): Promise<LeaderboardEntry> {
  return fetchJson(`/leaderboard/me?metric=${metric}&period=${period}`);
}
