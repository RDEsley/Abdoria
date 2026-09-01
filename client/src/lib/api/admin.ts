import { fetchJson } from './client';
import type { AppRatingEntry, Banimento, ReportMotivo, ReportStatus, UserRole } from '@/types';

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

interface AppSuggestionEntry {
  id: string;
  user_id: string;
  nome: string;
  texto: string;
  criada_em: string;
}

export interface AdminOverviewResponse {
  ratings: AppRatingEntry[];
  suggestions: AppSuggestionEntry[];
  media_estrelas: number | null;
  total_usuarios: number;
  pending_reports: number;
}

export interface AdminReportEntry {
  id: string;
  reporter_id: string;
  reporter_nome: string;
  reported_id: string;
  reported_nome: string;
  motivo: ReportMotivo;
  descricao: string | null;
  status: ReportStatus;
  criado_em: string;
  revisado_por: string | null;
  revisado_em: string | null;
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

/** Apaga a conta de outro usuário em definitivo (admin only). */
export function deleteAdminUser(id: string): Promise<{ ok: boolean }> {
  return fetchJson(`/admin/users/${id}`, { method: 'DELETE' });
}

export function getAdminReportsPendingCount(): Promise<{ count: number }> {
  return fetchJson('/admin/reports/pending-count');
}

export function getAdminReports(
  status: ReportStatus | 'todos' = 'pendente',
): Promise<{ reports: AdminReportEntry[] }> {
  return fetchJson(`/admin/reports?status=${status}`);
}

export function resolveAdminReport(
  id: string,
  status: 'revisado' | 'arquivado',
): Promise<{ report: AdminReportEntry }> {
  return fetchJson(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
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

export function submitAppSuggestion(
  texto: string,
): Promise<{ ok: boolean; user: import('@/types').IUserDocument }> {
  return fetchJson('/users/me/suggestion', {
    method: 'POST',
    body: JSON.stringify({ texto }),
  });
}
