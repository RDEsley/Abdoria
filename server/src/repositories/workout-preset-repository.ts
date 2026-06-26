import { getSupabase } from '../db.js';

export interface WorkoutPresetDocument {
  id: string;
  nome: string;
  nivel: string;
  objetivo: string;
  ciclo_id: string;
  descricao: string;
  recomendado: boolean;
  exercicios: Array<{
    slug: string;
    series: number;
    modo: string;
    repeticoes?: number | null;
    tempo_seg?: number | null;
    descanso_seg: number;
  }>;
}

function rowToPreset(row: Record<string, unknown>): WorkoutPresetDocument {
  return {
    id: String(row.id),
    nome: String(row.nome),
    nivel: String(row.nivel),
    objetivo: String(row.objetivo),
    ciclo_id: String(row.ciclo_id),
    descricao: String(row.descricao),
    recomendado: Boolean(row.recomendado),
    exercicios: (row.exercicios as WorkoutPresetDocument['exercicios']) ?? [],
  };
}

export const WorkoutPreset = {
  async find(options?: { sort?: Record<string, 1 | -1> }): Promise<WorkoutPresetDocument[]> {
    const sb = getSupabase();
    let query = sb.from('workout_presets').select('*');
    if (options?.sort) {
      const entries = Object.entries(options.sort);
      for (const [field, dir] of entries) {
        query = query.order(field, { ascending: dir === 1 });
      }
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToPreset);
  },

  async findOne(filter: Record<string, unknown>): Promise<WorkoutPresetDocument | null> {
    const sb = getSupabase();
    let query = sb.from('workout_presets').select('*');
    for (const [key, val] of Object.entries(filter)) {
      query = query.eq(key, val as string | boolean);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error || !data) return null;
    return rowToPreset(data as Record<string, unknown>);
  },

  async findById(id: string): Promise<WorkoutPresetDocument | null> {
    const sb = getSupabase();
    const { data, error } = await sb.from('workout_presets').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToPreset(data as Record<string, unknown>);
  },

  async findOneAndUpdate(
    filter: Record<string, unknown>,
    update: { $set: Partial<WorkoutPresetDocument> },
    options?: { upsert?: boolean },
  ): Promise<WorkoutPresetDocument | null> {
    const sb = getSupabase();
    const existing = await WorkoutPreset.findOne(filter);

    if (existing) {
      const patch = { ...update.$set };
      const { data, error } = await sb
        .from('workout_presets')
        .update(patch)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return rowToPreset(data as Record<string, unknown>);
    }

    if (options?.upsert) {
      const row = { ...filter, ...update.$set };
      const { data, error } = await sb.from('workout_presets').insert(row).select('*').single();
      if (error) throw error;
      return rowToPreset(data as Record<string, unknown>);
    }

    return null;
  },
};
