import { getSupabase } from '../db.js';

export interface ExerciseDocument {
  id: string;
  slug: string;
  nome: string;
  nome_pt?: string;
  nivel: number;
  musculo_principal: string;
  musculos_secundarios?: string[];
  tempo_recomendado: number;
  prioridade: string;
  modo?: string;
  repeticoes_iniciante?: number;
  repeticoes_intermediario?: number;
  repeticoes_avancado?: number;
  tempo_seg_iniciante?: number;
  tempo_seg_intermediario?: number;
  tempo_seg_avancado?: number;
  descanso_seg_iniciante?: number;
  descanso_seg_intermediario?: number;
  descanso_seg_avancado?: number;
  descricao?: string;
  media: { gif: string; video?: string };
  ativo: boolean;
  equipamento?: string | null;
}

function rowToExercise(row: Record<string, unknown>): ExerciseDocument {
  return {
    id: String(row.id),
    slug: String(row.slug),
    nome: String(row.nome),
    nome_pt: row.nome_pt ? String(row.nome_pt) : undefined,
    nivel: Number(row.nivel),
    musculo_principal: String(row.musculo_principal),
    musculos_secundarios: (row.musculos_secundarios as string[]) ?? [],
    tempo_recomendado: Number(row.tempo_recomendado),
    prioridade: String(row.prioridade),
    modo: row.modo ? String(row.modo) : undefined,
    repeticoes_iniciante: row.repeticoes_iniciante != null ? Number(row.repeticoes_iniciante) : undefined,
    repeticoes_intermediario: row.repeticoes_intermediario != null ? Number(row.repeticoes_intermediario) : undefined,
    repeticoes_avancado: row.repeticoes_avancado != null ? Number(row.repeticoes_avancado) : undefined,
    tempo_seg_iniciante: row.tempo_seg_iniciante != null ? Number(row.tempo_seg_iniciante) : undefined,
    tempo_seg_intermediario: row.tempo_seg_intermediario != null ? Number(row.tempo_seg_intermediario) : undefined,
    tempo_seg_avancado: row.tempo_seg_avancado != null ? Number(row.tempo_seg_avancado) : undefined,
    descanso_seg_iniciante: row.descanso_seg_iniciante != null ? Number(row.descanso_seg_iniciante) : undefined,
    descanso_seg_intermediario: row.descanso_seg_intermediario != null ? Number(row.descanso_seg_intermediario) : undefined,
    descanso_seg_avancado: row.descanso_seg_avancado != null ? Number(row.descanso_seg_avancado) : undefined,
    descricao: row.descricao ? String(row.descricao) : undefined,
    media: row.media as ExerciseDocument['media'],
    ativo: Boolean(row.ativo),
    equipamento: row.equipamento ? String(row.equipamento) : undefined,
  };
}

function exerciseToRow(ex: Partial<ExerciseDocument>): Record<string, unknown> {
  return {
    slug: ex.slug,
    nome: ex.nome,
    nome_pt: ex.nome_pt,
    nivel: ex.nivel,
    musculo_principal: ex.musculo_principal,
    musculos_secundarios: ex.musculos_secundarios ?? [],
    tempo_recomendado: ex.tempo_recomendado,
    prioridade: ex.prioridade,
    modo: ex.modo ?? 'reps',
    repeticoes_iniciante: ex.repeticoes_iniciante,
    repeticoes_intermediario: ex.repeticoes_intermediario,
    repeticoes_avancado: ex.repeticoes_avancado,
    tempo_seg_iniciante: ex.tempo_seg_iniciante,
    tempo_seg_intermediario: ex.tempo_seg_intermediario,
    tempo_seg_avancado: ex.tempo_seg_avancado,
    descanso_seg_iniciante: ex.descanso_seg_iniciante,
    descanso_seg_intermediario: ex.descanso_seg_intermediario,
    descanso_seg_avancado: ex.descanso_seg_avancado,
    descricao: ex.descricao,
    media: ex.media,
    ativo: ex.ativo ?? true,
    equipamento: ex.equipamento ?? null,
  };
}

export const Exercise = {
  async find(filter: Record<string, unknown> = {}, options?: { sort?: Record<string, 1 | -1> }): Promise<ExerciseDocument[]> {
    const sb = getSupabase();
    let query = sb.from('exercises').select('*');

    if (filter.ativo === true) query = query.eq('ativo', true);
    if (filter.musculo_principal) query = query.eq('musculo_principal', filter.musculo_principal as string);
    if (filter.nivel != null) query = query.eq('nivel', filter.nivel as number);
    if (filter.prioridade) query = query.eq('prioridade', filter.prioridade as string);
    if (filter.slug && typeof filter.slug === 'object' && '$in' in filter.slug) {
      query = query.in('slug', filter.slug.$in as string[]);
    }
    if (filter.slug && typeof filter.slug === 'object' && '$nin' in filter.slug) {
      const excluded = filter.slug.$nin as string[];
      for (const slug of excluded) {
        query = query.neq('slug', slug);
      }
    }
    if (filter.ativo === false) query = query.eq('ativo', false);
    if (filter.equipamento && typeof filter.equipamento === 'object' && '$in' in filter.equipamento) {
      query = query.in('equipamento', filter.equipamento.$in as string[]);
    }
    if (typeof filter.equipamento === 'string') {
      query = query.eq('equipamento', filter.equipamento);
    }

    if (options?.sort) {
      const [field, dir] = Object.entries(options.sort)[0] ?? [];
      if (field) query = query.order(field, { ascending: dir === 1 });
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToExercise);
  },

  async findOne(filter: { slug?: string; ativo?: boolean }): Promise<ExerciseDocument | null> {
    const sb = getSupabase();
    let query = sb.from('exercises').select('*');
    if (filter.slug) query = query.eq('slug', filter.slug);
    if (filter.ativo === true) query = query.eq('ativo', true);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return rowToExercise(data as Record<string, unknown>);
  },

  async findOneAndUpdate(
    filter: { slug: string },
    update: { $set: Partial<ExerciseDocument> },
    options?: { upsert?: boolean; new?: boolean },
  ): Promise<ExerciseDocument | null> {
    const sb = getSupabase();
    const existing = await Exercise.findOne({ slug: filter.slug });
    const row = exerciseToRow({ ...existing, ...update.$set, slug: filter.slug });

    if (existing) {
      const { data, error } = await sb.from('exercises').update(row).eq('slug', filter.slug).select('*').single();
      if (error) throw error;
      return rowToExercise(data as Record<string, unknown>);
    }

    if (options?.upsert) {
      const { data, error } = await sb.from('exercises').insert(row).select('*').single();
      if (error) throw error;
      return rowToExercise(data as Record<string, unknown>);
    }

    return null;
  },

  async updateMany(filter: { slug?: { $in?: string[] } }, update: { $set: { ativo?: boolean } }): Promise<{ modifiedCount: number }> {
    const sb = getSupabase();
    let query = sb.from('exercises').update(update.$set);
    if (filter.slug?.$in?.length) query = query.in('slug', filter.slug.$in);
    const { data, error } = await query.select('id');
    if (error) throw error;
    return { modifiedCount: data?.length ?? 0 };
  },
};
