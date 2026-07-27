import { getSupabase } from '../db.js';

export const LeaderboardWeekPayout = {
  async findById(weekKey: string): Promise<{ _id: string; paid_at: string } | null> {
    const sb = getSupabase();
    const { data } = await sb
      .from('leaderboard_week_payouts')
      .select('*')
      .eq('week_key', weekKey)
      .maybeSingle();
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

  /** Reivindica a chave com um insert (dedupe via PRIMARY KEY) — funciona
      como compare-and-swap: retorna true só pra quem venceu a corrida.
      Duas execuções concorrentes do payout semanal (ex.: dois jogadores
      abrindo o ranking no mesmo instante após a virada de domingo) usavam
      findById+create-no-fim, que deixava as duas passarem pelo check ANTES
      de qualquer uma commitar — pagando o prêmio 2x. Com o insert primeiro,
      a segunda chamada recebe violação de chave única e sai sem processar. */
  async claim(weekKey: string): Promise<boolean> {
    const sb = getSupabase();
    const { error } = await sb
      .from('leaderboard_week_payouts')
      .insert({ week_key: weekKey, paid_at: new Date().toISOString() });
    if (!error) return true;
    if (error.code === '23505') return false;
    throw error;
  },
};
