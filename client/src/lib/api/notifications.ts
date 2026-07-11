import { fetchJson } from './client';

export interface AppNotification {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  payload: Record<string, unknown>;
  lida_em: string | null;
  criada_em: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  unread_count: number;
}

export function getNotifications(): Promise<NotificationsResponse> {
  return fetchJson('/notifications');
}

export function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return fetchJson('/notifications/read-all', { method: 'POST' });
}
