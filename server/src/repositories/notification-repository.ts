import { getSupabase } from '../db.js';

export interface NotificationRow {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  payload: Record<string, unknown>;
  lida_em: string | null;
  criada_em: string;
}

export interface NewNotification {
  user_id: string;
  tipo: string;
  titulo: string;
  corpo?: string | null;
  payload?: Record<string, unknown>;
}

const LIST_LIMIT = 50;

export const Notifications = {
  async createMany(items: NewNotification[]): Promise<void> {
    if (items.length === 0) return;
    const sb = getSupabase();
    const { error } = await sb.from('notifications').insert(
      items.map((item) => ({
        user_id: item.user_id,
        tipo: item.tipo,
        titulo: item.titulo,
        corpo: item.corpo ?? null,
        payload: item.payload ?? {},
      })),
    );
    if (error) throw error;
  },

  async listForUser(userId: string): Promise<NotificationRow[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('criada_em', { ascending: false })
      .limit(LIST_LIMIT);
    if (error) throw error;
    return (data ?? []) as NotificationRow[];
  },

  async unreadCount(userId: string): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('lida_em', null);
    if (error) throw error;
    return count ?? 0;
  },

  async markAllRead(userId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from('notifications')
      .update({ lida_em: new Date().toISOString() })
      .eq('user_id', userId)
      .is('lida_em', null);
    if (error) throw error;
  },

  async deleteOne(userId: string, id: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('notifications').delete().eq('user_id', userId).eq('id', id);
    if (error) throw error;
  },

  async deleteAllForUser(userId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('notifications').delete().eq('user_id', userId);
    if (error) throw error;
  },
};
