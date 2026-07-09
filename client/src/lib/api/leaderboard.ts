import type { LeaderboardEntry, LeaderboardMetric } from '@/types';
import { LEADERBOARD_DISPLAY_LIMIT } from '@/types';
import { fetchJson } from './client';

export function getLeaderboard(metric: LeaderboardMetric = 'xp'): Promise<LeaderboardEntry[]> {
  return fetchJson(`/leaderboard?metric=${metric}&limit=${LEADERBOARD_DISPLAY_LIMIT}`);
}

export function getMyLeaderboardRank(metric: LeaderboardMetric = 'xp'): Promise<LeaderboardEntry> {
  return fetchJson(`/leaderboard/me?metric=${metric}`);
}
