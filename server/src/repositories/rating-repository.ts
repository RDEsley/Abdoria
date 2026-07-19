import { getSupabase } from '../db.js';
import type { AppRatingEntry } from '../types/index.js';

export const Ratings = {
  /** Uma avaliação por usuário — reenviar substitui a anterior. */
  async upsert(userId: string, estrelas: number, comentario: string | null): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('app_ratings').upsert(
      {
        user_id: userId,
        estrelas,
        comentario,
        atualizada_em: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;
  },

  async listAll(): Promise<AppRatingEntry[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('app_ratings')
      .select('id, user_id, estrelas, comentario, criada_em, profiles(nome)')
      .order('criada_em', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      nome:
        ((row as { profiles?: { nome?: string } | { nome?: string }[] }).profiles as
          | { nome?: string }
          | undefined)?.nome ?? 'Jogador',
      estrelas: Number(row.estrelas),
      comentario: (row.comentario as string | null) ?? null,
      criada_em: String(row.criada_em),
    }));
  },
};
