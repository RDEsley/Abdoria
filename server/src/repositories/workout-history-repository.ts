import { getSupabase } from '../db.js';

export interface WorkoutHistoryDocument {
  id: string;
  usuario_id: string;
  treino_nome: string;
  treino_tipo?: string;
  exercicios: Array<Record<string, unknown>>;
  duracao_total_segundos: number;
  musculos_estimulados?: string[];
  xp_ganho: number;
  concluido_em: Date | string;
}

function rowToHistory(row: Record<string, unknown>): WorkoutHistoryDocument {
  return {
    id: String(row.id),
    usuario_id: String(row.usuario_id),
    treino_nome: String(row.treino_nome),
    treino_tipo: row.treino_tipo ? String(row.treino_tipo) : undefined,
    exercicios: (row.exercicios as WorkoutHistoryDocument['exercicios']) ?? [],
    duracao_total_segundos: Number(row.duracao_total_segundos),
    musculos_estimulados: (row.musculos_estimulados as string[]) ?? [],
    xp_ganho: Number(row.xp_ganho),
    concluido_em: row.concluido_em as string,
  };
}

export const WorkoutHistory = {
  async find(
    filter: { usuario_id?: string; treino_tipo?: Record<string, unknown>; concluido_em?: Record<string, unknown> },
    options?: { sort?: Record<string, 1 | -1>; limit?: number; select?: string },
  ): Promise<WorkoutHistoryDocument[]> {
    const sb = getSupabase();
    let query = sb.from('workout_history').select('*');

    if (filter.usuario_id) query = query.eq('usuario_id', filter.usuario_id);
    if (filter.treino_tipo && typeof filter.treino_tipo === 'object' && '$nin' in filter.treino_tipo) {
      const excluded = filter.treino_tipo.$nin as (string | null)[];
      for (const val of excluded) {
        if (val === null || val === '') {
          query = query.not('treino_tipo', 'is', null);
        } else {
          query = query.neq('treino_tipo', val);
        }
      }
    }
    if (filter.concluido_em && typeof filter.concluido_em === 'object' && '$gte' in filter.concluido_em) {
      query = query.gte('concluido_em', filter.concluido_em.$gte as string);
    }

    if (options?.sort?.concluido_em) {
      query = query.order('concluido_em', { ascending: options.sort.concluido_em === 1 });
    }

    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToHistory);
  },

  async findOne(
    filter: { usuario_id: string },
    options?: { sort?: { concluido_em: -1 }; select?: string },
  ): Promise<WorkoutHistoryDocument | null> {
    const sb = getSupabase();
    let query = sb.from('workout_history').select('*').eq('usuario_id', filter.usuario_id);
    if (options?.sort?.concluido_em) {
      query = query.order('concluido_em', { ascending: false });
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error || !data) return null;
    return rowToHistory(data as Record<string, unknown>);
  },

  async create(data: Omit<WorkoutHistoryDocument, 'id'>): Promise<WorkoutHistoryDocument> {
    const sb = getSupabase();
    const row = {
      usuario_id: data.usuario_id,
      treino_nome: data.treino_nome,
      treino_tipo: data.treino_tipo,
      exercicios: data.exercicios,
      duracao_total_segundos: data.duracao_total_segundos,
      musculos_estimulados: data.musculos_estimulados ?? [],
      xp_ganho: data.xp_ganho,
      concluido_em: data.concluido_em ?? new Date().toISOString(),
    };
    const { data: inserted, error } = await sb.from('workout_history').insert(row).select('*').single();
    if (error) throw error;
    return rowToHistory(inserted as Record<string, unknown>);
  },

  async exists(filter: { usuario_id: string; concluido_em?: Record<string, unknown> }): Promise<boolean> {
    const sb = getSupabase();
    let query = sb.from('workout_history').select('id', { count: 'exact', head: true }).eq('usuario_id', filter.usuario_id);
    if (filter.concluido_em && '$gte' in filter.concluido_em) {
      query = query.gte('concluido_em', filter.concluido_em.$gte as string);
    }
    if (filter.concluido_em && '$lt' in filter.concluido_em) {
      query = query.lt('concluido_em', filter.concluido_em.$lt as string);
    }
    const { count } = await query;
    return (count ?? 0) > 0;
  },

  async aggregate(pipeline: unknown[]): Promise<unknown[]> {
    const sb = getSupabase();
    const first = pipeline[0] as { $match?: Record<string, unknown> };
    const match = first?.$match ?? {};
    const userId = String(match.usuario_id ?? '');

    if (
      pipeline.some((s) => (s as { $group?: { _id?: string } }).$group?._id === '$musculos_estimulados')
    ) {
      const { data } = await sb.from('workout_history').select('musculos_estimulados').eq('usuario_id', userId);
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        for (const m of (row.musculos_estimulados as string[]) ?? []) {
          counts[m] = (counts[m] ?? 0) + 1;
        }
      }
      return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
    }

    if (pipeline.some((s) => (s as { $group?: { total?: unknown } }).$group?.total)) {
      const groupStage = pipeline.find((s) => (s as { $group?: unknown }).$group) as {
        $group: { total?: { $sum?: unknown } };
      };
      const { data } = await sb.from('workout_history').select('*').eq('usuario_id', userId);

      if (groupStage?.$group?.total?.$sum === '$duracao_total_segundos') {
        const total = (data ?? []).reduce((s, r) => s + Number(r.duracao_total_segundos ?? 0), 0);
        return [{ total }];
      }

      const sumExpr = groupStage?.$group?.total?.$sum;
      if (sumExpr && JSON.stringify(sumExpr).includes('$size')) {
        const total = (data ?? []).reduce((s, r) => s + ((r.exercicios as unknown[])?.length ?? 0), 0);
        return [{ total }];
      }
    }

    if (
      pipeline.some((s) => {
        const groupId = (s as { $group?: { _id?: unknown } }).$group?._id;
        if (groupId === undefined) return false;
        return JSON.stringify(groupId).includes('dateToString');
      })
    ) {
      let query = sb.from('workout_history').select('concluido_em,duracao_total_segundos').eq('usuario_id', userId);
      const concluidoFilter = match.concluido_em as { $gte?: Date | string } | undefined;
      if (concluidoFilter?.$gte) {
        const since = concluidoFilter.$gte instanceof Date
          ? concluidoFilter.$gte.toISOString()
          : String(concluidoFilter.$gte);
        query = query.gte('concluido_em', since);
      }
      const { data } = await query;
      const byMonth: Record<string, number> = {};
      for (const row of data ?? []) {
        const d = new Date(row.concluido_em as string);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = (byMonth[key] ?? 0) + Number(row.duracao_total_segundos ?? 0) / 60;
      }
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_id, minutos]) => ({ _id, minutos }));
    }

    return [];
  },

  async updateById(id: string, patch: Partial<WorkoutHistoryDocument>): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('workout_history').update(patch).eq('id', id);
    if (error) throw error;
  },
};
