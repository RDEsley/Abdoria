import { getSupabase } from "../db.js";
import {
  decideDeliveryClaim,
  type DeliveryClaimState,
  type DeliveryStatus,
} from "../services/push-delivery-claim.js";

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

interface DeliveryRow {
  id: string;
  subscription_id: string;
  occurrence_key: string;
  status: DeliveryStatus;
  attempts: number;
  last_error: string | null;
  criada_em: string;
  atualizada_em: string;
}

export const PushSubscriptions = {
  async upsert(userId: string, input: PushSubscriptionInput): Promise<void> {
    const sb = getSupabase();
    const now = new Date().toISOString();
    const { error } = await sb.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        time_zone: input.time_zone?.trim() || "America/Sao_Paulo",
        atualizada_em: now,
      },
      { onConflict: "user_id,endpoint" },
    );
    if (error) throw error;
  },

  async deleteByEndpoint(userId: string, endpoint: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
    if (error) throw error;
  },

  async deleteAllForUser(userId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  },

  async listAll(): Promise<PushSubscriptionRow[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("push_subscriptions")
      .select("*")
      .order("id");
    if (error) throw error;
    return (data ?? []) as PushSubscriptionRow[];
  },
};

function toClaimState(row: DeliveryRow): DeliveryClaimState {
  return {
    status: row.status,
    attempts: row.attempts,
    updatedAtMs: new Date(row.atualizada_em).getTime(),
  };
}

export const PushDeliveryLog = {
  async claim(
    subscriptionId: string,
    occurrenceKey: string,
    now = new Date(),
  ): Promise<"send" | "skip"> {
    const sb = getSupabase();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();

    const { data: inserted, error: insertError } = await sb
      .from("push_delivery_log")
      .insert({
        subscription_id: subscriptionId,
        occurrence_key: occurrenceKey,
        status: "pending",
        attempts: 1,
        atualizada_em: nowIso,
      })
      .select("id")
      .maybeSingle();

    if (!insertError && inserted) return "send";
    if (insertError?.code !== "23505") throw insertError;

    const { data: existing, error: fetchError } = await sb
      .from("push_delivery_log")
      .select("id, status, attempts, atualizada_em")
      .eq("subscription_id", subscriptionId)
      .eq("occurrence_key", occurrenceKey)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return "skip";

    const decision = decideDeliveryClaim(
      toClaimState(existing as DeliveryRow),
      nowMs,
    );
    if (decision === "skip") return "skip";

    const nextAttempts = (existing.attempts ?? 0) + 1;
    const { data: updated, error: updateError } = await sb
      .from("push_delivery_log")
      .update({
        status: "pending",
        attempts: nextAttempts,
        last_error: null,
        atualizada_em: nowIso,
      })
      .eq("id", existing.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    return updated ? "send" : "skip";
  },

  async markSent(
    subscriptionId: string,
    occurrenceKey: string,
    now = new Date(),
  ): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from("push_delivery_log")
      .update({
        status: "sent",
        last_error: null,
        atualizada_em: now.toISOString(),
      })
      .eq("subscription_id", subscriptionId)
      .eq("occurrence_key", occurrenceKey)
      .eq("status", "pending");
    if (error) throw error;
  },

  async markFailed(
    subscriptionId: string,
    occurrenceKey: string,
    lastError: string,
    now = new Date(),
  ): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from("push_delivery_log")
      .update({
        status: "failed",
        last_error: lastError.slice(0, 500),
        atualizada_em: now.toISOString(),
      })
      .eq("subscription_id", subscriptionId)
      .eq("occurrence_key", occurrenceKey)
      .eq("status", "pending");
    if (error) throw error;
  },

  async pruneOlderThan(days: number): Promise<void> {
    const sb = getSupabase();
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { error } = await sb
      .from("push_delivery_log")
      .delete()
      .lt("atualizada_em", cutoff);
    if (error) throw error;
  },
};
