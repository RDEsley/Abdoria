import { getSupabase } from '../db.js';

export type SupportKind = 'bug' | 'suggestion' | 'feedback';
export type SupportStatus = 'pending' | 'in_progress' | 'resolved' | 'archived';

export interface SupportMessageRow {
  id: string;
  user_id: string;
  kind: SupportKind;
  status: SupportStatus;
  texto: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  nome?: string;
}

const KINDS = new Set<SupportKind>(['bug', 'suggestion', 'feedback']);
const STATUSES = new Set<SupportStatus>(['pending', 'in_progress', 'resolved', 'archived']);

export function isSupportKind(value: unknown): value is SupportKind {
  return typeof value === 'string' && KINDS.has(value as SupportKind);
}

export function isSupportStatus(value: unknown): value is SupportStatus {
  return typeof value === 'string' && STATUSES.has(value as SupportStatus);
}

export const SupportMessages = {
  async create(
    userId: string,
    input: { kind: SupportKind; texto: string; metadata?: Record<string, unknown> },
  ): Promise<SupportMessageRow> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('support_messages')
      .insert({
        user_id: userId,
        kind: input.kind,
        texto: input.texto,
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async list(options?: {
    status?: SupportStatus | 'all';
    kind?: SupportKind | 'all';
    limit?: number;
  }): Promise<SupportMessageRow[]> {
    const sb = getSupabase();
    let query = sb
      .from('support_messages')
      .select('id, user_id, kind, status, texto, metadata, created_at, updated_at, resolved_at, profiles(nome)')
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 200);
    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options?.kind && options.kind !== 'all') {
      query = query.eq('kind', options.kind);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => {
      const mapped = mapRow(row as Record<string, unknown>);
      const perfil = (row as { profiles?: { nome?: string } | { nome?: string }[] }).profiles;
      const nome = Array.isArray(perfil) ? perfil[0]?.nome : perfil?.nome;
      return { ...mapped, nome: nome ?? 'Jogador' };
    });
  },

  async countPending(): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('support_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw error;
    return count ?? 0;
  },

  async updateStatus(id: string, status: SupportStatus): Promise<SupportMessageRow> {
    const sb = getSupabase();
    const payload: Record<string, unknown> = { status };
    if (status === 'resolved' || status === 'archived') {
      payload.resolved_at = new Date().toISOString();
    }
    const { data, error } = await sb
      .from('support_messages')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },
};

function mapRow(row: Record<string, unknown>): SupportMessageRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    kind: row.kind as SupportKind,
    status: row.status as SupportStatus,
    texto: String(row.texto),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
  };
}
