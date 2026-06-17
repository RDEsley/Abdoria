import mongoose from 'mongoose';
import { Exercise } from '../models/Exercise.js';
import { WorkoutHistory } from '../models/WorkoutHistory.js';
import { WorkoutPreset } from '../models/WorkoutPreset.js';
import type { UserDocument } from '../models/User.js';
import type { ModoExercicio, MusculoPrincipal, TreinoBase, TreinoSugerido } from '../types/index.js';
import { formatExerciseName } from '../../../shared/types/exercise-display.js';
import { getTodaySaoPaulo, getWeekStartSaoPaulo } from '../utils/timezone.js';
import { getWeeklyMuscles } from './gamification.js';

export interface RecommendationAlert {
  id: string;
  tipo: 'troca_treino' | 'desbalanceamento' | 'foco_musculo';
  titulo: string;
  mensagem: string;
}

export interface RecommendWorkoutOptions {
  allowRepeats?: boolean;
  extraCount?: number;
  shuffle?: boolean;
  excludePresetId?: string | null;
}

function resolveNextCiclo(ciclo: TreinoBase[], lastTipo?: string | null): TreinoBase {
  if (!lastTipo || lastTipo === 'custom' || !ciclo.includes(lastTipo as TreinoBase)) {
    return ciclo[0];
  }
  const idx = ciclo.indexOf(lastTipo as TreinoBase);
  return ciclo[(idx + 1) % ciclo.length];
}

async function recentExerciseSlugs(userId: mongoose.Types.ObjectId, limit = 5): Promise<Set<string>> {
  const histories = await WorkoutHistory.find({ usuario_id: userId })
    .sort({ concluido_em: -1 })
    .limit(limit)
    .select('exercicios.slug')
    .lean();
  const slugs = new Set<string>();
  for (const h of histories) {
    for (const ex of h.exercicios ?? []) {
      if (ex.slug) slugs.add(ex.slug);
    }
  }
  return slugs;
}

async function presetToSugerido(preset: {
  _id: mongoose.Types.ObjectId;
  ciclo_id: string;
  nome: string;
  descricao?: string;
  exercicios: Array<{
    slug: string;
    series: number;
    modo: string;
    repeticoes?: number | null;
    tempo_seg?: number | null;
    descanso_seg: number;
  }>;
}): Promise<TreinoSugerido> {
  const slugs = preset.exercicios.map((e) => e.slug);
  const exercises = await Exercise.find({ slug: { $in: slugs }, ativo: true })
    .select('slug nome nome_pt musculo_principal')
    .lean();
  const nameBySlug = new Map(
    exercises.map((e) => [
      e.slug,
      formatExerciseName({ nome: e.nome, slug: e.slug, nome_pt: e.nome_pt ?? undefined }),
    ]),
  );

  const exercicios = preset.exercicios.map((pe) => ({
    slug: pe.slug,
    nome: nameBySlug.get(pe.slug) ?? pe.slug,
    series: pe.series,
    modo: pe.modo as ModoExercicio,
    repeticoes: pe.repeticoes ?? undefined,
    tempo_seg: pe.tempo_seg ?? undefined,
    descanso_seg: pe.descanso_seg,
  }));

  return {
    preset_id: preset._id.toString(),
    ciclo_id: preset.ciclo_id as TreinoBase,
    nome: preset.nome,
    descricao: preset.descricao ?? '',
    total_exercicios: exercicios.length,
    exercicios,
    primeiro_exercicio: exercicios[0]?.nome ?? null,
  };
}

async function findPresetCandidates(user: UserDocument, ciclo?: TreinoBase) {
  const cicloList = (user.preferencias?.ciclo_treinos ?? ['A', 'B', 'C']) as TreinoBase[];
  const filter: Record<string, unknown> = { recomendado: true, nivel: user.nivel, objetivo: user.objetivo };
  if (ciclo) filter.ciclo_id = ciclo;
  else filter.ciclo_id = { $in: cicloList };

  let presets = await WorkoutPreset.find(filter).lean();
  if (presets.length === 0) {
    presets = await WorkoutPreset.find({ recomendado: true, ciclo_id: ciclo ?? { $in: cicloList } }).lean();
  }
  return presets;
}

/** Alertas de personal trainer para o dashboard. */
export async function getRecommendationAlerts(user: UserDocument): Promise<RecommendationAlert[]> {
  const alerts: RecommendationAlert[] = [];
  const userId = user._id;

  const samePresetHistory = await WorkoutHistory.find({
    usuario_id: userId,
    treino_tipo: { $nin: [null, '', 'custom'] },
  })
    .sort({ concluido_em: -1 })
    .limit(14)
    .select('treino_tipo concluido_em')
    .lean();

  if (samePresetHistory.length >= 5) {
    const dominant = samePresetHistory[0]?.treino_tipo;
    const sameCount = samePresetHistory.filter((h) => h.treino_tipo === dominant).length;
    const oldest = samePresetHistory[samePresetHistory.length - 1]?.concluido_em;
    const daysSpan =
      oldest && samePresetHistory[0]?.concluido_em
        ? Math.floor(
            (new Date(samePresetHistory[0].concluido_em).getTime() - new Date(oldest).getTime()) /
              86_400_000,
          )
        : 0;
    if (dominant && sameCount >= 5 && daysSpan >= 6) {
      alerts.push({
        id: 'troca_treino',
        tipo: 'troca_treino',
        titulo: 'Hora de variar!',
        mensagem: `Você treinou o ciclo ${dominant} por mais de uma semana. Experimente outro treino recomendado para evoluir melhor.`,
      });
    }
  }

  const weekly = await getWeeklyMuscles(userId.toString(), user.muscle_map_reset_at ?? null);
  const zones = (['superior', 'inferior', 'obliquos', 'core'] as MusculoPrincipal[]).map((z) => ({
    z,
    n: weekly[z] ?? 0,
  }));
  const trained = zones.filter((z) => z.n > 0);
  if (trained.length >= 2) {
    const avg = trained.reduce((s, z) => s + z.n, 0) / trained.length;
    const dominant = trained.sort((a, b) => b.n - a.n)[0];
    if (dominant && dominant.n > avg * 2) {
      const weak = zones.filter((z) => z.n === 0).map((z) => z.z);
      alerts.push({
        id: 'desbalanceamento',
        tipo: 'desbalanceamento',
        titulo: 'Treino desbalanceado',
        mensagem: `Você focou muito em ${dominant.z} esta semana.${
          weak.length > 0 ? ` Que tal trabalhar ${weak.join(', ')}?` : ' Equilibre com outras zonas.'
        }`,
      });
    }
  }

  return alerts;
}

/** Próximo treino sugerido com exercícios resolvidos para o dashboard e construtor. */
export async function getSuggestedWorkout(
  user: UserDocument,
  options: RecommendWorkoutOptions = {},
): Promise<TreinoSugerido | null> {
  return recommendWorkout(user, options);
}

/** Recomenda treino com anti-repetição, shuffle e exercícios extras. */
export async function recommendWorkout(
  user: UserDocument,
  options: RecommendWorkoutOptions = {},
): Promise<TreinoSugerido | null> {
  const { allowRepeats = false, extraCount = 0, shuffle = false, excludePresetId = null } = options;
  const ciclo = (user.preferencias?.ciclo_treinos ?? ['A', 'B', 'C']) as TreinoBase[];

  const last = await WorkoutHistory.findOne({ usuario_id: user._id })
    .sort({ concluido_em: -1 })
    .select('treino_tipo')
    .lean();

  const nextCiclo = resolveNextCiclo(ciclo, last?.treino_tipo);
  let candidates = await findPresetCandidates(user, shuffle ? undefined : nextCiclo);

  if (excludePresetId) {
    const filtered = candidates.filter((p) => p._id.toString() !== excludePresetId);
    if (filtered.length > 0) candidates = filtered;
  }

  if (shuffle && candidates.length > 1) {
    const seed = `${user._id.toString()}:${getTodaySaoPaulo()}:${excludePresetId ?? 'x'}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    candidates = [...candidates].sort((a, b) => {
      const ha = (hash + a._id.toString().charCodeAt(0)) % 1000;
      const hb = (hash + b._id.toString().charCodeAt(0)) % 1000;
      return ha - hb;
    });
  }

  type PresetDoc = {
    _id: mongoose.Types.ObjectId;
    ciclo_id: string;
    nome: string;
    descricao?: string;
    exercicios: Array<{
      slug: string;
      series: number;
      modo: string;
      repeticoes?: number | null;
      tempo_seg?: number | null;
      descanso_seg: number;
    }>;
  };

  let preset: PresetDoc | null = (candidates[0] as PresetDoc | undefined) ?? null;
  if (!preset) {
    preset =
      (await WorkoutPreset.findOne({ ciclo_id: nextCiclo, recomendado: true }).lean()) ??
      (await WorkoutPreset.findOne({ recomendado: true }).lean());
  }
  if (!preset) return null;

  const recentSlugs = allowRepeats ? new Set<string>() : await recentExerciseSlugs(user._id);

  let exercicioRows = preset.exercicios.map((e) => ({
    slug: e.slug,
    series: e.series,
    modo: e.modo as ModoExercicio,
    repeticoes: e.repeticoes ?? undefined,
    tempo_seg: e.tempo_seg ?? undefined,
    descanso_seg: e.descanso_seg,
  }));
  if (!allowRepeats) {
    exercicioRows = exercicioRows.filter((e) => !recentSlugs.has(e.slug));
    if (exercicioRows.length < 3) {
      exercicioRows = preset.exercicios.map((e) => ({
        slug: e.slug,
        series: e.series,
        modo: e.modo as ModoExercicio,
        repeticoes: e.repeticoes ?? undefined,
        tempo_seg: e.tempo_seg ?? undefined,
        descanso_seg: e.descanso_seg,
      }));
    }
  }

  if (extraCount > 0) {
    const used = new Set(exercicioRows.map((e) => e.slug));
    const extras = await Exercise.find({
      ativo: true,
      slug: { $nin: [...used, ...(allowRepeats ? [] : [...recentSlugs])] },
    })
      .limit(extraCount * 3)
      .lean();

    for (const ex of extras.slice(0, extraCount)) {
      exercicioRows.push({
        slug: ex.slug,
        series: 3,
        modo: 'tempo' as ModoExercicio,
        repeticoes: undefined,
        tempo_seg: ex.tempo_recomendado ?? 30,
        descanso_seg: 25,
      });
      used.add(ex.slug);
    }
  }

  return presetToSugerido({
    _id: preset._id,
    ciclo_id: preset.ciclo_id,
    nome: preset.nome,
    descricao: preset.descricao,
    exercicios: exercicioRows,
  });
}

export async function getRecommendedPresetsList(user: UserDocument) {
  const ciclo = (user.preferencias?.ciclo_treinos ?? ['A', 'B', 'C']) as TreinoBase[];
  const strict = await WorkoutPreset.find({
    nivel: user.nivel,
    objetivo: user.objetivo,
    ciclo_id: { $in: ciclo },
    recomendado: true,
  }).lean();

  if (strict.length > 0) return strict;

  const relaxed = await WorkoutPreset.find({
    nivel: user.nivel,
    ciclo_id: { $in: ciclo },
    recomendado: true,
  }).lean();
  if (relaxed.length > 0) return relaxed;

  return WorkoutPreset.find({ recomendado: true, ciclo_id: { $in: ciclo } }).limit(6).lean();
}

export { getWeekStartSaoPaulo };
