import { fetchJson } from './client';
import type { AppRatingEntry, Banimento, UserRole } from '@/types';

export interface AdminUserEntry {
  id: string;
  nome: string;
  email: string;
  tag: string | null;
  role: UserRole;
  coins: number;
  gems: number;
  nivel_xp: number;
  streak_atual: number;
  banimento: Banimento | null;
  is_guest: boolean;
}

export interface AdminOverviewResponse {
  ratings: AppRatingEntry[];
  media_estrelas: number | null;
  total_usuarios: number;
}

export function getAdminOverview(): Promise<AdminOverviewResponse> {
  return fetchJson('/admin/overview');
}

export function getAdminUsers(q?: string): Promise<{ users: AdminUserEntry[] }> {
  const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return fetchJson(`/admin/users${query}`);
}

export function patchAdminUser(
  id: string,
  data: Partial<{ nome: string; senha: string; coins: number; gems: number; role: UserRole }>,
): Promise<{ user: AdminUserEntry }> {
  return fetchJson(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function banAdminUser(
  id: string,
  data: { tipo: 'ban' | 'suspensao'; motivo: string; dias?: number },
): Promise<{ user: AdminUserEntry }> {
  return fetchJson(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify(data) });
}

export function unbanAdminUser(id: string): Promise<{ user: AdminUserEntry }> {
  return fetchJson(`/admin/users/${id}/unban`, { method: 'POST' });
}

export function submitAppRating(
  estrelas: number,
  comentario?: string,
): Promise<{ ok: boolean; user: import('@/types').IUserDocument }> {
  return fetchJson('/users/me/rating', {
    method: 'POST',
    body: JSON.stringify({ estrelas, comentario }),
  });
}
