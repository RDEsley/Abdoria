import { getSupabase } from '../db.js';

export const Follows = {
  async follow(followerId: string, followedId: string): Promise<void> {
    const sb = getSupabase();
    await sb
      .from('follows')
      .upsert(
        { follower_id: followerId, followed_id: followedId },
        { onConflict: 'follower_id,followed_id', ignoreDuplicates: true },
      );
  },

  async unfollow(followerId: string, followedId: string): Promise<void> {
    const sb = getSupabase();
    await sb.from('follows').delete().eq('follower_id', followerId).eq('followed_id', followedId);
  },

  async followingIds(followerId: string): Promise<string[]> {
    const sb = getSupabase();
    const { data } = await sb.from('follows').select('followed_id').eq('follower_id', followerId);
    return (data ?? []).map((row) => row.followed_id as string);
  },

  async followerIds(userId: string): Promise<string[]> {
    const sb = getSupabase();
    const { data } = await sb.from('follows').select('follower_id').eq('followed_id', userId);
    return (data ?? []).map((row) => row.follower_id as string);
  },

  async counts(userId: string): Promise<{ followers: number; following: number }> {
    const sb = getSupabase();
    const [{ count: followers }, { count: following }] = await Promise.all([
      sb
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('followed_id', userId),
      sb
        .from('follows')
        .select('followed_id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ]);
    return { followers: followers ?? 0, following: following ?? 0 };
  },
};
