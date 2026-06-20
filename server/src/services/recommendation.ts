import { Exercise } from '../models/Exercise.js';
import { WorkoutHistory } from '../models/WorkoutHistory.js';
import { WorkoutPreset } from '../models/WorkoutPreset.js';
import type { UserDocument } from '../models/User.js';
import { UserMutable } from '../repositories/user-repository.js';
import type { ModoExercicio, MusculoPrincipal, TreinoBase, TreinoSugerido } from '../types/index.js';
import { normalizeCicloTreinos } from '../../../shared/types/index.js';
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

type PresetDoc = {
  _id: string;
  ciclo_id: string;
  nome: string;
  descricao?: string;
  nivel?: string;
  objetivo?: string;
  exercicios: Array<{
    slug: string;
    series: number;
    modo: string;
    repeticoes?: number | null;
    tempo_seg?: number | null;
    descanso_seg: number;
  }>;
};

function blockedSlugs(user: UserDocument): Set<string> {
  return new Set(user.preferencias?.exercicios_nao_recomendar ?? []);
}

function pinnedSlugs(user: UserDocument): string[] {
  return user.preferencias?.exercicios_fixos ?? [];
}

function resolveNextCiclo(ciclo: TreinoBase[], lastTipo?: string | null): TreinoBase {
  if (!lastTipo || lastTipo === 'custom' || !ciclo.includes(lastTipo as TreinoBase)) {
    return ciclo[0];
  }
  const idx = ciclo.indexOf(lastTipo as TreinoBase);
  return ciclo[(idx + 1) % ciclo.length];
}

async function recentExerciseSlugs(userId: string, limit = 5): Promise<Set<string>> {
  const histories = await WorkoutHistory.find(
    { usuario_id: userId },
    { sort: { concluido_em: -1 }, limit },
  );
  const slugs = new Set<string>();
  for (const h of histories) {
    for (const ex of h.exercicios ?? []) {
      const slug = (ex as { slug?: string }).slug;
      if (slug) slugs.add(slug);
    }
  }
  return slugs;
}

async function buildPinnedRows(user: UserDocument, blocked: Set<string>) {
  const slugs = pinnedSlugs(user).filter((s) => !blocked.has(s));
  if (slugs.length === 0) return [];

  const exercises = await Exercise.find({ slug: { $in: slugs }, ativo: true });
  return exercises.map((ex) => ({
    slug: ex.slug,
    series: 3,
    modo: 'tempo' as ModoExercicio,
    repeticoes: undefined,
    tempo_seg: ex.tempo_recomendado ?? 30,
    descanso_seg: 25,
  }));
}

async function presetToSugerido(preset: PresetDoc): Promise<TreinoSugerido> {
  const slugs = preset.exercicios.map((e) => e.slug);
  const exercises = await Exercise.find({ slug: { $in: slugs }, ativo: true });
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
    preset_id: preset._id,
    ciclo_id: preset.ciclo_id as TreinoBase,
    nome: preset.nome,
    descricao: preset.descricao ?? '',
    total_exercicios: exercicios.length,
    exercicios,
    primeiro_exercicio: exercicios[0]?.nome ?? null,
  };
}

async function pickBestPresetForCycle(user: UserDocument, cicloId: TreinoBase): Promise<PresetDoc | null> {
  const tiers: Array<{ nivel?: string; objetivo?: string }> = [
    { nivel: user.nivel, objetivo: user.objetivo },
    { nivel: user.nivel },
    {},
  ];

  for (const tier of tiers) {
    const filter: Record<string, unknown> = { recomendado: true, ciclo_id: cicloId };
    if (tier.nivel) filter.nivel = tier.nivel;
    if (tier.objetivo) filter.objetivo = tier.objetivo;
    const found = await WorkoutPreset.findOne(filter);
    if (found) return found as PresetDoc;
  }

  return WorkoutPreset.findOne({ recomendado: true, ciclo_id: cicloId }) as Promise<PresetDoc | null>;
}

async function presetsForUserCycles(user: UserDocument, onlyCiclo?: TreinoBase): Promise<PresetDoc[]> {
  const ciclos = normalizeCicloTreinos(user.preferencias?.ciclo_treinos as TreinoBase[] | undefined);
  const targetCiclos = onlyCiclo && ciclos.includes(onlyCiclo) ? [onlyCiclo] : ciclos;

  const presets: PresetDoc[] = [];
  for (const cicloId of targetCiclos) {
    const preset = await pickBestPresetForCycle(user, cicloId);
    if (preset) presets.push(preset);
  }
  return presets;
}

async function findPresetCandidates(user: UserDocument, ciclo?: TreinoBase) {
  return presetsForUserCycles(user, ciclo);
}

/** Marca ciclo concluído e retorna true se completou todos os ciclos ativos. */
export async function markCycleCompleted(
  user: UserMutable,
  treinoTipo?: string,
): Promise<boolean> {
  if (!treinoTipo || treinoTipo === 'custom') return false;

  const ciclos = normalizeCicloTreinos(user.preferencias?.ciclo_treinos as TreinoBase[] | undefined);
  if (!ciclos.includes(treinoTipo as TreinoBase)) return false;

  const rodada: Record<string, boolean> = { ...(user.preferencias.ciclos_completados_rodada ?? {}) };
  rodada[treinoTipo] = true;
  user.preferencias.ciclos_completados_rodada = rodada as UserDocument['preferencias']['ciclos_completados_rodada'];

  const allDone = ciclos.every((c) => rodada[c]);
  if (allDone) {
    user.preferencias.ciclos_completados_rodada = {};
    await user.save();
    return true;
  }

  await user.save();
  return false;
}

export function resetCycleRound(user: UserMutable): void {
  user.preferencias.ciclos_completados_rodada = {};
}

export async function getRecommendationAlerts(user: UserDocument): Promise<RecommendationAlert[]> {
  const alerts: RecommendationAlert[] = [];
  const userId = user._id;

  const samePresetHistory = await WorkoutHistory.find(
    { usuario_id: userId, treino_tipo: { $nin: [null, '', 'custom'] } },
    { sort: { concluido_em: -1 }, limit: 14 },
  );

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

  const weekly = await getWeeklyMuscles(userId, user.muscle_map_reset_at ?? null);
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

export async function getSuggestedWorkout(
  user: UserDocument,
  options: RecommendWorkoutOptions = {},
): Promise<TreinoSugerido | null> {
  return recommendWorkout(user, options);
}

export async function recommendWorkout(
  user: UserDocument,
  options: RecommendWorkoutOptions = {},
): Promise<TreinoSugerido | null> {
  const { allowRepeats = false, extraCount = 0, shuffle = false, excludePresetId = null } = options;
  const ciclo = normalizeCicloTreinos(user.preferencias?.ciclo_treinos as TreinoBase[] | undefined);
  const blocked = blockedSlugs(user);

  const last = await WorkoutHistory.findOne(
    { usuario_id: user._id },
    { sort: { concluido_em: -1 } },
  );

  const nextCiclo = resolveNextCiclo(ciclo, last?.treino_tipo);
  let candidates = shuffle
    ? await presetsForUserCycles(user)
    : await findPresetCandidates(user, nextCiclo);

  if (excludePresetId) {
    const filtered = candidates.filter((p) => p._id !== excludePresetId);
    if (filtered.length > 0) candidates = filtered;
  }

  if (shuffle && candidates.length > 1) {
    const seed = `${user._id}:${getTodaySaoPaulo()}:${excludePresetId ?? 'x'}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    candidates = [...candidates].sort((a, b) => {
      const ha = (hash + a._id.charCodeAt(0)) % 1000;
      const hb = (hash + b._id.charCodeAt(0)) % 1000;
      return ha - hb;
    });
  }

  let preset: PresetDoc | null = candidates[0] ?? null;
  if (!preset) {
    preset = await pickBestPresetForCycle(user, nextCiclo);
  }
  if (!preset) return null;

  const recentSlugs = allowRepeats ? new Set<string>() : await recentExerciseSlugs(user._id);
  const pinned = await buildPinnedRows(user, blocked);

  let exercicioRows = preset.exercicios
    .filter((e) => !blocked.has(e.slug))
    .map((e) => ({
      slug: e.slug,
      series: e.series,
      modo: e.modo as ModoExercicio,
      repeticoes: e.repeticoes ?? undefined,
      tempo_seg: e.tempo_seg ?? undefined,
      descanso_seg: e.descanso_seg,
    }));

  for (const pin of pinned) {
    if (!exercicioRows.some((e) => e.slug === pin.slug)) {
      exercicioRows.unshift(pin);
    }
  }

  if (!allowRepeats) {
    exercicioRows = exercicioRows.filter((e) => !recentSlugs.has(e.slug) || pinned.some((p) => p.slug === e.slug));
    if (exercicioRows.length < 3) {
      exercicioRows = [
        ...pinned,
        ...preset.exercicios
          .filter((e) => !blocked.has(e.slug) && !pinned.some((p) => p.slug === e.slug))
          .map((e) => ({
            slug: e.slug,
            series: e.series,
            modo: e.modo as ModoExercicio,
            repeticoes: e.repeticoes ?? undefined,
            tempo_seg: e.tempo_seg ?? undefined,
            descanso_seg: e.descanso_seg,
          })),
      ];
    }
  }

  if (extraCount > 0) {
    const used = new Set(exercicioRows.map((e) => e.slug));
    const extras = await Exercise.find({
      ativo: true,
      slug: { $nin: [...used, ...blocked, ...(allowRepeats ? [] : [...recentSlugs])] },
    });

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
  return presetsForUserCycles(user);
}

export { getWeekStartSaoPaulo };
