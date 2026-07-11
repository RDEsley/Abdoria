import type { MolduraId } from '@/types';
import { fetchJson } from './client';

export interface FollowSuggestion {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  moldura_equipada: MolduraId | null;
  level: number;
}

export function getFollowSuggestions(): Promise<{
  items: FollowSuggestion[];
  following_count: number;
}> {
  return fetchJson('/social/suggestions');
}

export function followUser(userId: string): Promise<{ ok: boolean }> {
  return fetchJson('/social/follow', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
}

export function unfollowUser(userId: string): Promise<{ ok: boolean }> {
  return fetchJson(`/social/follow/${userId}`, { method: 'DELETE' });
}
