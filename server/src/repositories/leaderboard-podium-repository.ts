import { getSupabase } from '../db.js';

export interface PodiumHistoryEntry {
  user_id: string;
  week_key: string;
  metric: 'xp' | 'moedas';
  position: 1 | 2 | 3;
}

/** Contagem de pódios por posição (todas as métricas somadas). */
export interface PodiumCounts {
  first: number;
  second: number;
  third: number;
}

export const LeaderboardPodiumHistory = {
  async createMany(entries: PodiumHistoryEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const sb = getSupabase();
    await sb.from('leaderboard_podium_history').insert(entries);
  },

  async countsForUsers(userIds: string[]): Promise<Map<string, PodiumCounts>> {
    const result = new Map<string, PodiumCounts>();
    if (userIds.length === 0) return result;
    const sb = getSupabase();
    const { data } = await sb
      .from('leaderboard_podium_history')
      .select('user_id, position')
      .in('user_id', userIds);
    for (const row of data ?? []) {
      const counts = result.get(row.user_id) ?? { first: 0, second: 0, third: 0 };
      if (row.position === 1) counts.first += 1;
      else if (row.position === 2) counts.second += 1;
      else if (row.position === 3) counts.third += 1;
      result.set(row.user_id, counts);
    }
    return result;
  },

  async countsForUser(userId: string): Promise<PodiumCounts> {
    const sb = getSupabase();
    const { data } = await sb
      .from('leaderboard_podium_history')
      .select('position')
      .eq('user_id', userId);
    const counts: PodiumCounts = { first: 0, second: 0, third: 0 };
    for (const row of data ?? []) {
      if (row.position === 1) counts.first += 1;
      else if (row.position === 2) counts.second += 1;
      else if (row.position === 3) counts.third += 1;
    }
    return counts;
  },
};
