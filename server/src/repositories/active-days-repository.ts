import { getSupabase } from '../db.js';
import type { ActiveDayRecord, ActiveDaySource } from '../../../shared/active-day.js';
import { throwIfMissingRelation } from '../utils/schema-errors.js';

function rowToActiveDay(row: Record<string, unknown>): ActiveDayRecord {
  return {
    user_id: String(row.user_id),
    day_key: String(row.day_key).slice(0, 10),
    first_source: String(row.first_source),
    sources: Array.isArray(row.sources) ? row.sources.map(String) : [],
    first_at: String(row.first_at),
  };
}

export const ActiveDays = {
  async record(
    userId: string,
    source: ActiveDaySource | string,
    at: Date,
  ): Promise<ActiveDayRecord> {
    const sb = getSupabase();
    const { data, error } = await sb.rpc('record_valid_daily_action', {
      p_user_id: userId,
      p_source: source,
      p_at: at.toISOString(),
    });

    if (error) {
      throwIfMissingRelation(error, 'active_days');
    }
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row) {
      throw new Error('Falha ao registrar dia ativo.');
    }
    return rowToActiveDay(row);
  },

  async has(userId: string, dayKey: string): Promise<boolean> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('active_days')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('day_key', dayKey);
    if (error) throwIfMissingRelation(error, 'active_days');
    return (count ?? 0) > 0;
  },

  async listDayKeys(userId: string): Promise<string[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('active_days')
      .select('day_key')
      .eq('user_id', userId)
      .order('day_key', { ascending: false });
    if (error) throwIfMissingRelation(error, 'active_days');
    return (data ?? []).map((row) => String(row.day_key).slice(0, 10));
  },

  async countSince(userId: string, fromDayKey: string): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('active_days')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('day_key', fromDayKey);
    if (error) throwIfMissingRelation(error, 'active_days');
    return count ?? 0;
  },

  async listSince(userId: string, fromDayKey: string): Promise<ActiveDayRecord[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('active_days')
      .select('*')
      .eq('user_id', userId)
      .gte('day_key', fromDayKey)
      .order('day_key', { ascending: true });
    if (error) throwIfMissingRelation(error, 'active_days');
    return (data ?? []).map((row) => rowToActiveDay(row as Record<string, unknown>));
  },
};
