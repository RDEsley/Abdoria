import { WorkoutHistory } from '../domain/WorkoutHistory.js';
import type { UserRecord } from '../domain/User.js';
import type { UserMutable } from '../repositories/user-repository.js';
import type { ExerciseDocument } from '../domain/Exercise.js';
import type {
  Foco,
  ModoExercicio,
  NivelUsuario,
  PlanoDia,
  PlanoTreino,
  TreinoSugerido,
  TreinoSugeridoExercicio,
} from '../types/index.js';
import { FOCO_LABELS, getExerciseParamsForNivel } from '../types/index.js';
import {
  FOCO_PARAMS,
  PROGRESSION_WEEKS,
  SESSION_EXERCISE_COUNT,
  doseReps,
  doseTempoSeg,
} from '../../../shared/training-plan.js';
import { formatExerciseName } from '../../../shared/types/exercise-display.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import { findExercisesForUserDocument } from './exercise-catalog.js';

export interface PlanRecommendOptions {
  allowRepeats?: boolean;
  shuffle?: boolean;
  forceDia?: number;
}

const MAX_NIVEL_BY_USER: Record<NivelUsuario, number> = {
  iniciante: 2,
  intermediario: 3,
  avancado: 4,
};

const PRIORIDADE_RANK: Record<string, number> = {
  S: 0,
  A: 1,
  B: 2,
  dinamico: 2,
  isometrico: 2,
  C: 3,
};

const RECENT_PENALTY = 10;
const ENFASE_BONUS = -2;
const MIN_EXERCISES = 3;

/** Usuário está no modo plano (corpo todo)? Decide o pipeline de recomendação. */
export function isPlanoUser(user: UserRecord): boolean {
  return user.perfil_treino?.escopo === 'corpo_todo' && user.plano_treino != null;
}

function resolveDiaAtual(plano: PlanoTreino, forceDia?: number): PlanoDia {
  const dias = [...plano.dias].sort((a, b) => a.indice - b.indice);
  if (forceDia != null) {
    const forced = dias.find((d) => d.indice === forceDia);
    if (forced) return forced;
  }
  const done = new Set(plano.dias_completados_rodada);
  return dias.find((d) => !done.has(d.indice)) ?? dias[0];
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

function seededJitter(seed: string, slug: string): number {
  let hash = 0;
  const key = `${seed}:${slug}`;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

interface ScoredExercise {
  exercise: ExerciseDocument;
  score: number;
  grupoPrincipal: string;
}

function scorePool(
  pool: ExerciseDocument[],
  dia: PlanoDia,
  recent: Set<string>,
  penalizeRecent: boolean,
  shuffleSeed: string | null,
): ScoredExercise[] {
  return pool.map((exercise) => {
    let score = PRIORIDADE_RANK[exercise.prioridade] ?? 2;
    if (penalizeRecent && recent.has(exercise.slug)) score += RECENT_PENALTY;
    if (
      dia.enfase_abs &&
      exercise.grupos.includes('abdomen') &&
      exercise.musculo_principal === dia.enfase_abs
    ) {
      score += ENFASE_BONUS;
    }
    if (shuffleSeed) score += seededJitter(shuffleSeed, exercise.slug) * 4;

    const grupoPrincipal =
      dia.grupos.find((g) => exercise.grupos[0] === g) ??
      dia.grupos.find((g) => exercise.grupos.includes(g)) ??
      dia.grupos[0];

    return { exercise, score, grupoPrincipal };
  });
}

/** Seleção com quota por grupo: round-robin entre os grupos do dia, melhor score primeiro. */
function selectByGroupQuota(scored: ScoredExercise[], dia: PlanoDia, target: number) {
  const buckets = new Map<string, ScoredExercise[]>();
  for (const grupo of dia.grupos) buckets.set(grupo, []);
  for (const item of scored) {
    buckets.get(item.grupoPrincipal)?.push(item);
  }
  for (const bucket of buckets.values()) bucket.sort((a, b) => a.score - b.score);

  const selected: ExerciseDocument[] = [];
  const used = new Set<string>();
  while (selected.length < target) {
    let picked = false;
    for (const grupo of dia.grupos) {
      if (selected.length >= target) break;
      const bucket = buckets.get(grupo) ?? [];
      const next = bucket.find((item) => !used.has(item.exercise.slug));
      if (next) {
        selected.push(next.exercise);
        used.add(next.exercise.slug);
        picked = true;
      }
    }
    if (!picked) break;
  }
  return selected;
}

function toSugeridoExercicio(
  exercise: ExerciseDocument,
  foco: Foco,
  semana: number,
  nivel: NivelUsuario,
  modoPadrao: ModoExercicio,
): TreinoSugeridoExercicio {
  const params = getExerciseParamsForNivel(
    exercise as Parameters<typeof getExerciseParamsForNivel>[0],
    nivel,
  );
  const modo: ModoExercicio = exercise.modo === 'ambos' ? modoPadrao : params.modo;
  const focoParams = FOCO_PARAMS[foco];

  return {
    slug: exercise.slug,
    nome: formatExerciseName({
      nome: exercise.nome,
      slug: exercise.slug,
      nome_pt: exercise.nome_pt ?? undefined,
    }),
    series: focoParams.series,
    modo,
    repeticoes: modo === 'reps' ? doseReps(params.repeticoes || 12, foco, semana) : undefined,
    tempo_seg:
      modo === 'tempo'
        ? doseTempoSeg(params.tempo_seg || exercise.tempo_recomendado || 30, foco, semana)
        : undefined,
    descanso_seg: focoParams.descanso_seg,
  };
}

/** Resolve o treino do dia a partir do plano corpo-todo. */
export async function recommendFromPlano(
  user: UserRecord,
  options: PlanRecommendOptions = {},
): Promise<TreinoSugerido | null> {
  const plano = user.plano_treino;
  const perfil = user.perfil_treino;
  if (!plano || !perfil || plano.dias.length === 0) return null;

  const dia = resolveDiaAtual(plano, options.forceDia);
  const restricoes = new Set(perfil.restricoes ?? []);
  const blocked = new Set(user.preferencias?.exercicios_nao_recomendar ?? []);
  const pinnedSlugs = user.preferencias?.exercicios_fixos ?? [];
  const maxNivel = MAX_NIVEL_BY_USER[user.nivel] ?? 3;

  const catalog = await findExercisesForUserDocument(user);
  const pool = catalog.filter(
    (ex) =>
      ex.nivel <= maxNivel &&
      !blocked.has(ex.slug) &&
      ex.grupos.some((g) => dia.grupos.includes(g as PlanoDia['grupos'][number])) &&
      !ex.contraindicacoes.some((c) => restricoes.has(c as never)),
  );

  const recent = options.allowRepeats ? new Set<string>() : await recentExerciseSlugs(user.id);
  const shuffleSeed = options.shuffle ? `${user.id}:${getTodaySaoPaulo()}:${dia.indice}` : null;

  const target = SESSION_EXERCISE_COUNT[perfil.tempo_por_sessao_min] ?? 6;

  const pinned = pool.filter((ex) => pinnedSlugs.includes(ex.slug));
  const scored = scorePool(
    pool.filter((ex) => !pinnedSlugs.includes(ex.slug)),
    dia,
    recent,
    true,
    shuffleSeed,
  );

  let selected = [
    ...pinned,
    ...selectByGroupQuota(scored, dia, Math.max(target - pinned.length, 0)),
  ];

  if (selected.length < MIN_EXERCISES) {
    // Pool pequeno: refaz sem penalidade de repetição recente.
    const relaxed = scorePool(
      pool.filter((ex) => !pinnedSlugs.includes(ex.slug)),
      dia,
      recent,
      false,
      shuffleSeed,
    );
    selected = [
      ...pinned,
      ...selectByGroupQuota(relaxed, dia, Math.max(target - pinned.length, 0)),
    ];
  }

  if (selected.length === 0) return null;

  const semana = Math.min(Math.max(plano.semana_atual, 1), PROGRESSION_WEEKS);
  const modoPadrao: ModoExercicio = user.preferencias?.modo_padrao === 'tempo' ? 'tempo' : 'reps';
  const exercicios = selected.map((ex) =>
    toSugeridoExercicio(ex, perfil.foco, semana, user.nivel, modoPadrao),
  );

  return {
    preset_id: `plano-dia-${dia.indice}`,
    ciclo_id: dia.ciclo_id,
    nome: dia.titulo,
    descricao: `Semana ${semana} · foco em ${FOCO_LABELS[perfil.foco].toLowerCase()}`,
    total_exercicios: exercicios.length,
    exercicios,
    primeiro_exercicio: exercicios[0]?.nome ?? null,
    plano_dia_indice: dia.indice,
    plano_total_dias: plano.dias.length,
    plano_titulo: `Missão ${dia.indice + 1}/${plano.dias.length}`,
  };
}

/**
 * Marca um dia do plano como concluído. Retorna true se fechou a rodada
 * (todos os dias da semana do plano) — mesma celebração da rodada de ciclos.
 */
export async function markPlanoDayCompleted(
  user: UserMutable,
  planoDiaIndice: number,
): Promise<boolean> {
  const plano = user.plano_treino;
  if (!plano || !plano.dias.some((d) => d.indice === planoDiaIndice)) return false;

  const done = new Set(plano.dias_completados_rodada);
  done.add(planoDiaIndice);

  const allDone = plano.dias.every((d) => done.has(d.indice));
  if (allDone) {
    user.plano_treino = {
      ...plano,
      dias_completados_rodada: [],
      semana_atual: (plano.semana_atual % PROGRESSION_WEEKS) + 1,
    };
    await user.save();
    return true;
  }

  user.plano_treino = { ...plano, dias_completados_rodada: [...done].sort((a, b) => a - b) };
  await user.save();
  return false;
}
