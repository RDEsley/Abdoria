import { WorkoutHistory } from '../domain/WorkoutHistory.js';
import { WorkoutPreset } from '../domain/WorkoutPreset.js';
import type { UserRecord } from '../domain/User.js';
import { UserMutable } from '../repositories/user-repository.js';
import type {
  ModoExercicio,
  MusculoPrincipal,
  TreinoBase,
  TreinoSugerido,
} from '../types/index.js';
import { normalizeCicloTreinos } from '../../../shared/types/index.js';
import {
  doseForAbProfile,
  exerciseCountForProfile,
  restSecondsForProfile,
  seriesForProfile,
} from '../../../shared/ab-training-profile.js';
import { formatExerciseName } from '../../../shared/types/exercise-display.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import { getWeeklyMuscles } from './gamification.js';
import { filterRowsByAvailableSlugs, findExercisesForUserDocument } from './exercise-catalog.js';
import { getPlanoAlerts, isPlanoUser, recommendFromPlano } from './plan-generator.js';

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
  /** Força um ciclo específico (A–G) em vez de avançar pela sequência automática. */
  forceCiclo?: TreinoBase;
  /** Força um dia específico do plano corpo-todo (modo plano). */
  forceDia?: number;
}

type PresetDoc = {
  id: string;
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

function blockedSlugs(user: UserRecord): Set<string> {
  return new Set(user.preferencias?.exercicios_nao_recomendar ?? []);
}

function pinnedSlugs(user: UserRecord): string[] {
  return user.preferencias?.exercicios_fixos ?? [];
}

function pinnedPresetIds(user: UserRecord): string[] {
  return user.preferencias?.treinos_fixos ?? [];
}

function blockedPresetIds(user: UserRecord): Set<string> {
  return new Set(user.preferencias?.treinos_nao_recomendar ?? []);
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

async function buildPinnedRows(user: UserRecord, blocked: Set<string>) {
  const slugs = pinnedSlugs(user).filter((s) => !blocked.has(s));
  if (slugs.length === 0) return [];

  const catalog = await findExercisesForUserDocument(user);
  const exercises = catalog.filter((ex) => slugs.includes(ex.slug));
  return exercises.map((ex) => ({
    slug: ex.slug,
    series: 3,
    modo: (ex.modo === 'reps' ? 'reps' : 'tempo') as ModoExercicio,
    repeticoes: ex.modo === 'reps' ? ex.repeticoes_intermediario || 12 : undefined,
    tempo_seg:
      ex.modo === 'tempo' ? ex.tempo_seg_intermediario || ex.tempo_recomendado || 30 : undefined,
    descanso_seg: ex.descanso_seg_intermediario ?? 25,
  }));
}

async function presetToSugerido(
  preset: PresetDoc,
  user: UserRecord,
  blocked: Set<string>,
): Promise<TreinoSugerido> {
  const slugs = preset.exercicios.map((e) => e.slug);
  const catalog = await findExercisesForUserDocument(user);
  const exercises = catalog.filter((ex) => slugs.includes(ex.slug));
  const nameBySlug = new Map(
    exercises.map((e) => [
      e.slug,
      formatExerciseName({ nome: e.nome, slug: e.slug, nome_pt: e.nome_pt ?? undefined }),
    ]),
  );

  const exercicios = preset.exercicios
    .filter((pe) => nameBySlug.has(pe.slug) && !blocked.has(pe.slug))
    .map((pe) => ({
      slug: pe.slug,
      nome: nameBySlug.get(pe.slug) ?? pe.slug,
      series: pe.series,
      modo: pe.modo as ModoExercicio,
      repeticoes: pe.repeticoes ?? undefined,
      tempo_seg: pe.tempo_seg ?? undefined,
      descanso_seg: pe.descanso_seg,
    }));

  return {
    preset_id: preset.id,
    ciclo_id: preset.ciclo_id as TreinoBase,
    nome: preset.nome,
    descricao: preset.descricao ?? '',
    total_exercicios: exercicios.length,
    exercicios,
    primeiro_exercicio: exercicios[0]?.nome ?? null,
  };
}

async function pickBestPresetForCycle(
  user: UserRecord,
  cicloId: TreinoBase,
): Promise<PresetDoc | null> {
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

  return WorkoutPreset.findOne({
    recomendado: true,
    ciclo_id: cicloId,
  }) as Promise<PresetDoc | null>;
}

async function presetsForUserCycles(
  user: UserRecord,
  onlyCiclo?: TreinoBase,
): Promise<PresetDoc[]> {
  const ciclos = normalizeCicloTreinos(
    user.preferencias?.ciclo_treinos as TreinoBase[] | undefined,
  );
  const targetCiclos = onlyCiclo && ciclos.includes(onlyCiclo) ? [onlyCiclo] : ciclos;

  const presets: PresetDoc[] = [];
  for (const cicloId of targetCiclos) {
    const preset = await pickBestPresetForCycle(user, cicloId);
    if (preset) presets.push(preset);
  }
  return presets;
}

async function findPresetCandidates(user: UserRecord, ciclo?: TreinoBase) {
  return presetsForUserCycles(user, ciclo);
}

/** Marca ciclo concluído e retorna true se completou todos os ciclos ativos. */
export async function markCycleCompleted(user: UserMutable, treinoTipo?: string): Promise<boolean> {
  if (!treinoTipo || treinoTipo === 'custom') return false;

  const ciclos = normalizeCicloTreinos(
    user.preferencias?.ciclo_treinos as TreinoBase[] | undefined,
  );
  if (!ciclos.includes(treinoTipo as TreinoBase)) return false;

  const rodada: Record<string, boolean> = {
    ...(user.preferencias.ciclos_completados_rodada ?? {}),
  };
  rodada[treinoTipo] = true;
  user.preferencias.ciclos_completados_rodada =
    rodada as UserRecord['preferencias']['ciclos_completados_rodada'];

  const allDone = ciclos.every((c) => rodada[c]);
  if (allDone) {
    user.preferencias.ciclos_completados_rodada = {};
    await user.saveColumns(['preferencias']);
    return true;
  }

  await user.saveColumns(['preferencias']);
  return false;
}

export async function getRecommendationAlerts(user: UserRecord): Promise<RecommendationAlert[]> {
  // Modo plano: rotação de dias já garante variedade; o alerta relevante é o
  // desbalanceamento por parte do corpo (não por zona abdominal).
  if (isPlanoUser(user)) {
    return getPlanoAlerts(user);
  }

  const alerts: RecommendationAlert[] = [];
  const userId = user.id;

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
          weak.length > 0
            ? ` Que tal trabalhar ${weak.join(', ')}?`
            : ' Equilibre com outras zonas.'
        }`,
      });
    }
  }

  return alerts;
}

export async function getSuggestedWorkout(
  user: UserRecord,
  options: RecommendWorkoutOptions = {},
): Promise<TreinoSugerido | null> {
  if (isPlanoUser(user)) {
    return recommendFromPlano(user, {
      allowRepeats: options.allowRepeats,
      shuffle: options.shuffle,
      forceDia: options.forceDia,
    });
  }
  const profile = user.ab_training_profile_v2;
  if (!profile) return recommendWorkout(user, options);

  const target = exerciseCountForProfile(profile);
  const suggested = await recommendWorkout(user, { ...options, extraCount: target * 3 });
  if (!suggested) return null;
  const catalog = await findExercisesForUserDocument(user);
  const coreCatalog = catalog.filter((exercise) => exercise.grupos.includes('abdomen'));
  const coreSlugs = new Set(coreCatalog.map((exercise) => exercise.slug));
  const pinned = new Set(pinnedSlugs(user));
  const pinnedExercises = suggested.exercicios.filter((exercise) => pinned.has(exercise.slug));
  const baseCandidates = [
    ...suggested.exercicios.filter(
      (exercise) => !pinned.has(exercise.slug) && coreSlugs.has(exercise.slug),
    ),
    ...coreCatalog.map((exercise) => ({
      slug: exercise.slug,
      nome: formatExerciseName(exercise),
      series: 3,
      modo: (exercise.modo === 'reps' ? 'reps' : 'tempo') as ModoExercicio,
      repeticoes: exercise.repeticoes_intermediario ?? 12,
      tempo_seg: exercise.tempo_seg_intermediario ?? exercise.tempo_recomendado ?? 30,
      descanso_seg: exercise.descanso_seg_intermediario ?? 25,
    })),
  ];
  const seen = new Set<string>();
  const baseExercises = baseCandidates
    .filter(
      (exercise) =>
        !pinned.has(exercise.slug) && !seen.has(exercise.slug) && seen.add(exercise.slug),
    )
    .slice(0, target);
  const series = seriesForProfile(profile);
  const rest = restSecondsForProfile(profile);
  const exercicios = [...pinnedExercises, ...baseExercises].map((exercise) => ({
    ...exercise,
    series,
    descanso_seg: rest,
    repeticoes:
      exercise.modo === 'reps'
        ? doseForAbProfile(profile, 'reps', exercise.repeticoes ?? 12)
        : undefined,
    tempo_seg:
      exercise.modo === 'tempo'
        ? doseForAbProfile(profile, 'tempo', exercise.tempo_seg ?? 30)
        : undefined,
  }));
  return {
    ...suggested,
    nome: `Treino ${profile.intensity === 'evolyn' ? 'Evolyn' : profile.intensity}`,
    descricao: `${profile.training_days.length} dias por semana · ${profile.volume}`,
    exercicios,
    total_exercicios: exercicios.length,
    primeiro_exercicio: exercicios[0]?.nome ?? null,
  };
}

async function resolvePinnedPreset(
  user: UserRecord,
  excludePresetId: string | null,
): Promise<PresetDoc | null> {
  const blockedPresets = blockedPresetIds(user);
  for (const presetId of pinnedPresetIds(user)) {
    if (blockedPresets.has(presetId) || presetId === excludePresetId) continue;
    const preset = (await WorkoutPreset.findById(presetId)) as PresetDoc | null;
    if (preset) return preset;
  }
  return null;
}

async function recommendWorkout(
  user: UserRecord,
  options: RecommendWorkoutOptions = {},
): Promise<TreinoSugerido | null> {
  const {
    allowRepeats = false,
    extraCount = 0,
    shuffle = false,
    excludePresetId = null,
    forceCiclo,
  } = options;
  const ciclo = normalizeCicloTreinos(user.preferencias?.ciclo_treinos as TreinoBase[] | undefined);
  const blocked = blockedSlugs(user);
  const blockedPresets = blockedPresetIds(user);

  const pinnedPreset = await resolvePinnedPreset(user, excludePresetId);
  if (pinnedPreset) {
    return presetToSugerido(pinnedPreset, user, blocked);
  }

  const last = await WorkoutHistory.findOne(
    { usuario_id: user.id },
    { sort: { concluido_em: -1 } },
  );

  const nextCiclo =
    forceCiclo && ciclo.includes(forceCiclo)
      ? forceCiclo
      : resolveNextCiclo(ciclo, last?.treino_tipo);
  let candidates = shuffle
    ? await presetsForUserCycles(user)
    : await findPresetCandidates(user, nextCiclo);

  candidates = candidates.filter((p) => !blockedPresets.has(p.id));

  if (excludePresetId) {
    const filtered = candidates.filter((p) => p.id !== excludePresetId);
    if (filtered.length > 0) candidates = filtered;
  }

  if (shuffle && candidates.length > 1) {
    const seed = `${user.id}:${getTodaySaoPaulo()}:${excludePresetId ?? 'x'}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    candidates = [...candidates].sort((a, b) => {
      const ha = (hash + a.id.charCodeAt(0)) % 1000;
      const hb = (hash + b.id.charCodeAt(0)) % 1000;
      return ha - hb;
    });
  }

  let preset: PresetDoc | null = candidates[0] ?? null;
  if (!preset) {
    const fallback = await pickBestPresetForCycle(user, nextCiclo);
    preset = fallback && !blockedPresets.has(fallback.id) ? fallback : null;
  }
  if (!preset) return null;

  const catalog = await findExercisesForUserDocument(user);
  const recentSlugs = allowRepeats ? new Set<string>() : await recentExerciseSlugs(user.id);
  const pinned = await buildPinnedRows(user, blocked);

  let exercicioRows = filterRowsByAvailableSlugs(
    preset.exercicios
      .filter((e) => !blocked.has(e.slug))
      .map((e) => ({
        slug: e.slug,
        series: e.series,
        modo: e.modo as ModoExercicio,
        repeticoes: e.repeticoes ?? undefined,
        tempo_seg: e.tempo_seg ?? undefined,
        descanso_seg: e.descanso_seg,
      })),
    catalog,
  );

  for (const pin of pinned) {
    if (!exercicioRows.some((e) => e.slug === pin.slug)) {
      exercicioRows.unshift(pin);
    }
  }

  if (!allowRepeats) {
    exercicioRows = exercicioRows.filter(
      (e) => !recentSlugs.has(e.slug) || pinned.some((p) => p.slug === e.slug),
    );
    if (exercicioRows.length < 3) {
      exercicioRows = filterRowsByAvailableSlugs(
        [
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
        ],
        catalog,
      );
    }
  }

  if (extraCount > 0) {
    const used = new Set(exercicioRows.map((e) => e.slug));
    const extras = catalog.filter(
      (ex) =>
        !used.has(ex.slug) && !blocked.has(ex.slug) && (allowRepeats || !recentSlugs.has(ex.slug)),
    );

    for (const ex of extras.slice(0, extraCount)) {
      exercicioRows.push({
        slug: ex.slug,
        series: 3,
        modo: (ex.modo === 'reps' ? 'reps' : 'tempo') as ModoExercicio,
        repeticoes: ex.modo === 'reps' ? ex.repeticoes_intermediario || 12 : undefined,
        tempo_seg:
          ex.modo === 'tempo'
            ? ex.tempo_seg_intermediario || ex.tempo_recomendado || 30
            : undefined,
        descanso_seg: ex.descanso_seg_intermediario ?? 25,
      });
      used.add(ex.slug);
    }
  }

  return presetToSugerido(
    {
      id: preset.id,
      ciclo_id: preset.ciclo_id,
      nome: preset.nome,
      descricao: preset.descricao,
      exercicios: exercicioRows,
    },
    user,
    blocked,
  );
}
