/**
 * Evolyn "Day Guide" (A seguir) — deterministic scoring for the single next
 * best suggestion (plus an optional secondary preview) shown on the home
 * screen. Pure and side-effect free so it can be unit tested without a DB.
 *
 * Priority (highest score wins):
 *  1. Routine scheduled for today (or already started today) and incomplete.
 *  2. Activity occurrence pending that is overdue or soon (within ~90min).
 *  3. Recommended workout, if the user hasn't trained today.
 *  4. Near-complete quest (only considered when provided in the input).
 *  5. Later planned activity ("mais tarde").
 *  6. Fallback: day is in order — soft rest/review suggestion.
 *
 * Copy is intentionally soft — no guilt language, no streak-shaming.
 */
import { getHourSaoPaulo, getMinutesOfDaySaoPaulo } from '../utils/timezone.js';
import { activityOccursOnDay, periodFromHour } from './schedule.js';
import type { ActivityPeriod, ActivitySchedule, RoutineItemRecord } from './types.js';

export type DayGuideKind = 'workout' | 'activity' | 'routine' | 'quest' | 'review' | 'rest';

export interface DayGuideItem {
  kind: DayGuideKind;
  title: string;
  subtitle?: string;
  href: string;
  cta?: string;
  /** e.g. "PRÓXIMO PASSO" | "AGORA" | "MAIS TARDE" | "DIA EM ORDEM" */
  eyebrow?: string;
  meta?: Record<string, unknown>;
  /** Internal ranking score — not meant to be sent to clients. */
  score: number;
}

export interface DayGuideResult {
  primary: DayGuideItem;
  secondary?: DayGuideItem;
}

export interface DayGuideRoutineInput {
  id: string;
  name: string;
  schedule: ActivitySchedule;
  items?: RoutineItemRecord[];
}

export interface DayGuideLogInput {
  routine_id: string | null;
  activity_id: string | null;
}

export interface DayGuideOccurrenceInput {
  activity_id: string;
  name: string;
  time: string | null;
  period: ActivityPeriod | null;
  status: 'pending' | 'done';
}

export interface DayGuideQuestInput {
  id: string;
  title: string;
  progress: number;
  goal: number;
}

export interface BuildDayGuideInput {
  todayKey: string;
  /** Defaults to `new Date()`; inject a fixed date in tests. */
  now?: Date;
  trainedToday: boolean;
  suggestedWorkoutTitle?: string | null;
  routines: DayGuideRoutineInput[];
  /** All activity logs recorded today (any activity/routine). */
  todayLogs: DayGuideLogInput[];
  occurrences: DayGuideOccurrenceInput[];
  /** Quest progress, if the caller already has it computed cheaply. */
  quests?: DayGuideQuestInput[];
  /** Enables an optional "review your week" secondary link when the day is in order. */
  weeklyReviewAvailable?: boolean;
}

const SCORE = {
  ROUTINE_BASE: 900,
  ACTIVITY_NOW_BASE: 800,
  WORKOUT: 700,
  QUEST: 600,
  ACTIVITY_LATER_BASE: 300,
  REST: 100,
};

/** Minutes elapsed since midnight in America/Sao_Paulo. */
function nowMinutesSaoPaulo(date: Date): number {
  return getMinutesOfDaySaoPaulo(date);
}

function timeToMinutes(time: string): number {
  const [hh, mm] = time.split(':').map(Number);
  return hh * 60 + mm;
}

/**
 * Ids de atividade concluídos hoje *dentro desta rotina especificamente*.
 * Isola por `routine_id` — uma conclusão avulsa da mesma atividade feita
 * fora da rotina (ou dentro de outra rotina) não conta aqui. Usado tanto
 * pelo Day Guide quanto pelo RoutineRunner (progresso/isolamento de cada
 * execução de rotina).
 */
export function routineDoneActivityIdsToday(
  routine: { id: string },
  todayLogs: DayGuideLogInput[],
): Set<string> {
  const done = new Set<string>();
  for (const log of todayLogs) {
    if (log.routine_id !== routine.id || !log.activity_id) continue;
    done.add(log.activity_id);
  }
  return done;
}

/** How many of a routine's items were completed today *within that routine*. */
export function routineItemsDoneToday(
  routine: { id: string; items?: RoutineItemRecord[] },
  todayLogs: DayGuideLogInput[],
): number {
  const items = routine.items ?? [];
  if (items.length === 0) return 0;
  const doneActivityIds = routineDoneActivityIdsToday(routine, todayLogs);
  return items.filter((item) => doneActivityIds.has(item.activity_id)).length;
}

/**
 * Whether a routine should be considered "for today" at all.
 * - Scheduled routines (daily/weekdays/once) follow their schedule normally.
 * - Unscheduled ("manual") routines are only relevant once the user has
 *   already started them today — we never proactively recommend a manual
 *   routine the user hasn't touched.
 */
export function isRoutineRelevantToday(
  routine: { id: string; schedule: ActivitySchedule },
  todayKey: string,
  todayLogs: DayGuideLogInput[],
): boolean {
  if (routine.schedule.kind === 'unscheduled') {
    return todayLogs.some((log) => log.routine_id === routine.id);
  }
  return activityOccursOnDay(routine.schedule, todayKey);
}

function scheduleTimeProximity(
  schedule: ActivitySchedule,
  nowMin: number,
): { overdue: boolean; soon: boolean } {
  const times = schedule.times ?? [];
  let overdue = false;
  let soon = false;
  for (const time of times) {
    const diff = timeToMinutes(time) - nowMin;
    if (diff <= 0 && diff >= -240) overdue = true;
    if (diff > 0 && diff <= 90) soon = true;
  }
  return { overdue, soon };
}

function buildRoutineCandidate(
  routine: DayGuideRoutineInput,
  todayLogs: DayGuideLogInput[],
  todayKey: string,
  nowMin: number,
  currentPeriod: ActivityPeriod,
): DayGuideItem | null {
  const items = routine.items ?? [];
  if (items.length === 0) return null;
  if (!isRoutineRelevantToday(routine, todayKey, todayLogs)) return null;

  const doneCount = routineItemsDoneToday(routine, todayLogs);
  if (doneCount >= items.length) return null;

  const partial = doneCount > 0;
  const { overdue, soon } = scheduleTimeProximity(routine.schedule, nowMin);
  const periodMatch = Boolean(routine.schedule.period) && routine.schedule.period === currentPeriod;

  let score = SCORE.ROUTINE_BASE;
  if (partial) score += 25;
  if (overdue) score += 30;
  if (soon) score += 45;
  if (periodMatch) score += 15;

  const remaining = items.length - doneCount;
  const subtitle = overdue
    ? partial
      ? 'Essa rotina estava planejada para agora. Quer continuar de onde parou?'
      : 'Essa rotina estava planejada para agora.'
    : partial
      ? `${doneCount} de ${items.length} concluídas · continue de onde parou.`
      : `${items.length} ${items.length === 1 ? 'passo' : 'passos'} no seu ritmo de hoje.`;

  return {
    kind: 'routine',
    title: routine.name,
    subtitle,
    href: `/rotina/${routine.id}`,
    cta: partial ? 'Continuar rotina' : 'Começar rotina',
    eyebrow: overdue || soon ? 'AGORA' : 'PRÓXIMO PASSO',
    meta: { routine_id: routine.id, items_total: items.length, items_done: doneCount, remaining },
    score,
  };
}

type ActivityUrgency = 'now' | 'later';

function activityUrgency(occurrence: DayGuideOccurrenceInput, nowMin: number): ActivityUrgency {
  if (!occurrence.time) return 'now';
  const diff = timeToMinutes(occurrence.time) - nowMin;
  return diff <= 90 ? 'now' : 'later';
}

function pickBestOccurrence(
  occurrences: DayGuideOccurrenceInput[],
  nowMin: number,
  urgency: ActivityUrgency,
): DayGuideOccurrenceInput | null {
  const pending = occurrences.filter(
    (occ) => occ.status !== 'done' && activityUrgency(occ, nowMin) === urgency,
  );
  if (pending.length === 0) return null;
  return pending.sort((a, b) => {
    const da = a.time ? Math.abs(timeToMinutes(a.time) - nowMin) : 0;
    const db = b.time ? Math.abs(timeToMinutes(b.time) - nowMin) : 0;
    return da - db;
  })[0];
}

function buildActivityCandidate(
  occurrence: DayGuideOccurrenceInput,
  nowMin: number,
  urgency: ActivityUrgency,
): DayGuideItem {
  const diff = occurrence.time ? timeToMinutes(occurrence.time) - nowMin : null;
  const overdue = diff !== null && diff <= 0;

  if (urgency === 'later') {
    return {
      kind: 'activity',
      title: occurrence.name,
      subtitle: `Planejada para mais tarde, às ${occurrence.time}.`,
      href: '/atividades',
      cta: 'Ver mais tarde',
      eyebrow: 'MAIS TARDE',
      meta: { activity_id: occurrence.activity_id, time: occurrence.time },
      score: SCORE.ACTIVITY_LATER_BASE + Math.max(0, 60 - (diff ?? 0) / 10),
    };
  }

  const subtitle =
    diff === null
      ? 'Encaixe quando fizer sentido hoje.'
      : overdue
        ? 'Ainda dá tempo hoje, no seu ritmo.'
        : `Em breve, por volta das ${occurrence.time}.`;

  let score = SCORE.ACTIVITY_NOW_BASE;
  if (overdue) score += 20;
  else if (diff !== null) score += 30;

  return {
    kind: 'activity',
    title: occurrence.name,
    subtitle,
    href: '/atividades',
    cta: 'Registrar agora',
    eyebrow: diff !== null ? 'AGORA' : 'PRÓXIMO PASSO',
    meta: { activity_id: occurrence.activity_id, time: occurrence.time },
    score,
  };
}

function buildWorkoutCandidate(
  trainedToday: boolean,
  suggestedTitle: string | null,
): DayGuideItem | null {
  if (trainedToday) return null;
  return {
    kind: 'workout',
    title: suggestedTitle ?? 'Treino do dia',
    subtitle: 'Um treino pensado pra hoje, sem pressa pra começar.',
    href: '/treino',
    cta: 'Ver treino',
    eyebrow: 'PRÓXIMO PASSO',
    meta: {},
    score: SCORE.WORKOUT,
  };
}

function buildQuestCandidate(quests: DayGuideQuestInput[] | undefined): DayGuideItem | null {
  if (!quests?.length) return null;
  const ranked = quests
    .filter((q) => q.goal > 0 && q.progress < q.goal)
    .map((q) => ({ quest: q, remaining: q.goal - q.progress, ratio: q.progress / q.goal }))
    .filter((q) => q.remaining === 1 || q.ratio >= 0.66)
    .sort((a, b) => b.ratio - a.ratio);
  const best = ranked[0];
  if (!best) return null;

  return {
    kind: 'quest',
    title: best.quest.title,
    subtitle:
      best.remaining === 1
        ? 'Falta só mais um passo para essa missão.'
        : `Faltam ${best.remaining} para completar essa missão.`,
    href: '/',
    cta: 'Ver missão',
    eyebrow: 'QUASE LÁ',
    meta: { quest_id: best.quest.id, progress: best.quest.progress, goal: best.quest.goal },
    score: SCORE.QUEST,
  };
}

function buildRestCandidate(weeklyReviewAvailable: boolean | undefined): DayGuideResult {
  const primary: DayGuideItem = {
    kind: 'rest',
    title: 'Seu dia está em ordem.',
    subtitle: 'Nada pendente por aqui — aproveite para descansar.',
    href: '/atividades',
    cta: 'Ver atividades',
    eyebrow: 'DIA EM ORDEM',
    meta: {},
    score: SCORE.REST,
  };
  if (!weeklyReviewAvailable) return { primary };
  const secondary: DayGuideItem = {
    kind: 'review',
    title: 'Dê uma olhada na sua semana',
    subtitle: 'Um resumo do que você já construiu até aqui.',
    href: '/perfil',
    cta: 'Ver retrospectiva',
    eyebrow: 'MAIS TARDE',
    meta: {},
    score: SCORE.REST - 10,
  };
  return { primary, secondary };
}

export function buildDayGuide(input: BuildDayGuideInput): DayGuideResult {
  const now = input.now ?? new Date();
  const nowMin = nowMinutesSaoPaulo(now);
  const currentPeriod = periodFromHour(getHourSaoPaulo(now));

  const routineCandidate = input.routines
    .map((routine) =>
      buildRoutineCandidate(routine, input.todayLogs, input.todayKey, nowMin, currentPeriod),
    )
    .filter((candidate): candidate is DayGuideItem => candidate !== null)
    .sort((a, b) => b.score - a.score)[0];

  const urgentOccurrence = pickBestOccurrence(input.occurrences, nowMin, 'now');
  const urgentCandidate = urgentOccurrence
    ? buildActivityCandidate(urgentOccurrence, nowMin, 'now')
    : null;

  const laterOccurrence = pickBestOccurrence(input.occurrences, nowMin, 'later');
  const laterCandidate = laterOccurrence
    ? buildActivityCandidate(laterOccurrence, nowMin, 'later')
    : null;

  const workoutCandidate = buildWorkoutCandidate(
    input.trainedToday,
    input.suggestedWorkoutTitle ?? null,
  );
  const questCandidate = buildQuestCandidate(input.quests);

  const candidates = [
    routineCandidate ?? null,
    urgentCandidate,
    workoutCandidate,
    questCandidate,
    laterCandidate,
  ].filter((candidate): candidate is DayGuideItem => candidate !== null);

  if (candidates.length === 0) {
    return buildRestCandidate(input.weeklyReviewAvailable);
  }

  candidates.sort((a, b) => b.score - a.score);
  const [primary, secondary] = candidates;
  return secondary ? { primary, secondary } : { primary };
}
