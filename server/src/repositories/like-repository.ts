import { getSupabase } from '../db.js';

/** Curtidas de perfil (coração no perfil público) — unilateral, dedupe por par. */
export const ProfileLikes = {
  async like(likerId: string, likedId: string): Promise<void> {
    const sb = getSupabase();
    await sb
      .from('profile_likes')
      .upsert(
        { liker_id: likerId, liked_id: likedId },
        { onConflict: 'liker_id,liked_id', ignoreDuplicates: true },
      );
  },

  async unlike(likerId: string, likedId: string): Promise<void> {
    const sb = getSupabase();
    await sb.from('profile_likes').delete().eq('liker_id', likerId).eq('liked_id', likedId);
  },

  /** Quantas curtidas o perfil recebeu. Degrada pra 0 se a tabela ainda não existe. */
  async countFor(userId: string): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('profile_likes')
      .select('liker_id', { count: 'exact', head: true })
      .eq('liked_id', userId);
    if (error) return 0;
    return count ?? 0;
  },

  /** true se `likerId` já curtiu o perfil de `likedId`. Degrada pra false. */
  async hasLiked(likerId: string, likedId: string): Promise<boolean> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('profile_likes')
      .select('liker_id', { count: 'exact', head: true })
      .eq('liker_id', likerId)
      .eq('liked_id', likedId);
    if (error) return false;
    return (count ?? 0) > 0;
  },
};
