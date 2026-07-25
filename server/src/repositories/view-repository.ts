import { getSupabase } from '../db.js';

/** Visualizações de perfil (contador de "quem viu meu perfil") — dedupe por par, visitante único. */
export const ProfileViews = {
  async record(viewerId: string, viewedId: string): Promise<void> {
    if (viewerId === viewedId) return;
    const sb = getSupabase();
    await sb
      .from('profile_views')
      .upsert(
        { viewer_id: viewerId, viewed_id: viewedId },
        { onConflict: 'viewer_id,viewed_id', ignoreDuplicates: true },
      );
  },

  /** Quantos visitantes únicos o perfil recebeu. Degrada pra 0 se a tabela ainda não existe. */
  async countFor(userId: string): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('profile_views')
      .select('viewer_id', { count: 'exact', head: true })
      .eq('viewed_id', userId);
    if (error) return 0;
    return count ?? 0;
  },
};
