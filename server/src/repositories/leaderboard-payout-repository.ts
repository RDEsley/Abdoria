import { getSupabase } from '../db.js';

export const LeaderboardWeekPayout = {
  async findById(weekKey: string): Promise<{ _id: string; paid_at: string } | null> {
    const sb = getSupabase();
    const { data } = await sb.from('leaderboard_week_payouts').select('*').eq('week_key', weekKey).maybeSingle();
    if (!data) return null;
    return { _id: data.week_key, paid_at: data.paid_at };
  },

  async create(data: { _id: string; paid_at?: Date }): Promise<void> {
    const sb = getSupabase();
    await sb.from('leaderboard_week_payouts').insert({
      week_key: data._id,
      paid_at: (data.paid_at ?? new Date()).toISOString(),
    });
  },
};
