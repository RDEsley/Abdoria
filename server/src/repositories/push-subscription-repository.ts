import { getSupabase } from '../db.js';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  time_zone: string;
  criada_em: string;
  atualizada_em: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  time_zone?: string;
}

export const PushSubscriptions = {
  async upsert(userId: string, input: PushSubscriptionInput): Promise<void> {
    const sb = getSupabase();
    const now = new Date().toISOString();
    const { error } = await sb.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        time_zone: input.time_zone?.trim() || 'America/Sao_Paulo',
        atualizada_em: now,
      },
      { onConflict: 'user_id,endpoint' },
    );
    if (error) throw error;
  },

  async deleteByEndpoint(userId: string, endpoint: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    if (error) throw error;
  },

  async deleteAllForUser(userId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('push_subscriptions').delete().eq('user_id', userId);
    if (error) throw error;
  },

  async listAll(): Promise<PushSubscriptionRow[]> {
    const sb = getSupabase();
    const { data, error } = await sb.from('push_subscriptions').select('*');
    if (error) throw error;
    return (data ?? []) as PushSubscriptionRow[];
  },
};

export const PushDeliveryLog = {
  async tryRecord(userId: string, deliveryKey: string): Promise<boolean> {
    const sb = getSupabase();
    const { error } = await sb.from('push_delivery_log').insert({
      user_id: userId,
      delivery_key: deliveryKey,
    });
    if (!error) return true;
    if (error.code === '23505') return false;
    throw error;
  },

  async pruneOlderThan(days: number): Promise<void> {
    const sb = getSupabase();
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { error } = await sb.from('push_delivery_log').delete().lt('enviada_em', cutoff);
    if (error) throw error;
  },
};
