import type { MolduraId } from '@/types';
import { fetchJson } from './client';

export interface SocialUserEntry {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  moldura_equipada: MolduraId | null;
  moldura_count: number | null;
  level: number;
  streak_atual: number;
  is_me: boolean;
  /** Você segue essa pessoa. */
  seguindo: boolean;
  /** Essa pessoa segue você. */
  segue_voce: boolean;
  /** Seguem um ao outro. */
  amigo: boolean;
}

/** Ranking entre amigos (seguem um ao outro) + você, ordenado por level. */
export function getFriends(): Promise<{ items: SocialUserEntry[] }> {
  return fetchJson('/social/friends');
}

export function getFollowing(): Promise<{ items: SocialUserEntry[] }> {
  return fetchJson('/social/following');
}

export function getFollowers(): Promise<{ items: SocialUserEntry[] }> {
  return fetchJson('/social/followers');
}

export function searchUsers(query: string): Promise<{ items: SocialUserEntry[] }> {
  return fetchJson(`/social/search?q=${encodeURIComponent(query)}`);
}

export function followUser(userId: string): Promise<{ ok: boolean }> {
  return fetchJson('/social/follow', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
}

export function unfollowUser(userId: string): Promise<{ ok: boolean }> {
  return fetchJson(`/social/follow/${userId}`, { method: 'DELETE' });
}

/** Remove um seguidor (ele deixa de seguir você). */
export function removeFollower(userId: string): Promise<{ ok: boolean }> {
  return fetchJson(`/social/follower/${userId}`, { method: 'DELETE' });
}

export interface LikeResponse {
  ok: boolean;
  total: number;
  eu_curti: boolean;
}

export function likeProfile(userId: string): Promise<LikeResponse> {
  return fetchJson('/social/like', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
}

export function unlikeProfile(userId: string): Promise<LikeResponse> {
  return fetchJson(`/social/like/${userId}`, { method: 'DELETE' });
}

export function getMySocial(): Promise<{
  followers: number;
  following: number;
  amigos: number;
  following_ids: string[];
  likes_recebidos: number;
  visualizacoes_recebidas: number;
}> {
  return fetchJson('/social/me');
}
