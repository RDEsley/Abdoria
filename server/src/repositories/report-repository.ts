import { getSupabase } from '../db.js';
import type { ReportMotivo, ReportStatus } from '../types/index.js';

export interface UserReportRow {
  id: string;
  reporter_id: string;
  reported_id: string;
  motivo: ReportMotivo;
  descricao: string | null;
  status: ReportStatus;
  criado_em: string;
  revisado_por: string | null;
  revisado_em: string | null;
}

export const UserReports = {
  async create(data: {
    reporter_id: string;
    reported_id: string;
    motivo: ReportMotivo;
    descricao?: string | null;
  }): Promise<UserReportRow> {
    const sb = getSupabase();
    const { data: row, error } = await sb
      .from('user_reports')
      .insert({
        reporter_id: data.reporter_id,
        reported_id: data.reported_id,
        motivo: data.motivo,
        descricao: data.descricao?.trim() || null,
      })
      .select('*')
      .single();
    if (error || !row) throw error ?? new Error('Falha ao registrar denúncia.');
    return row as UserReportRow;
  },

  /** true se já existe uma denúncia pendente do mesmo par reporter/reported — evita spam. */
  async hasPending(reporterId: string, reportedId: string): Promise<boolean> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('user_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', reporterId)
      .eq('reported_id', reportedId)
      .eq('status', 'pendente');
    if (error) return false;
    return (count ?? 0) > 0;
  },

  async listByStatus(status: ReportStatus | 'todos', limit = 100): Promise<UserReportRow[]> {
    const sb = getSupabase();
    let query = sb
      .from('user_reports')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(limit);
    if (status !== 'todos') query = query.eq('status', status);
    const { data } = await query;
    return (data ?? []) as UserReportRow[];
  },

  async countPending(): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('user_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente');
    if (error) return 0;
    return count ?? 0;
  },

  async resolve(id: string, status: ReportStatus, resolverId: string): Promise<UserReportRow | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('user_reports')
      .update({ status, revisado_por: resolverId, revisado_em: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) return null;
    return data as UserReportRow;
  },
};
