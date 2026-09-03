/**
 * Quest (mission) catalog — deterministic, static definitions.
 *
 * Progress functions are pure and operate on data already available in
 * the DaySnapshot payload, so no extra queries are needed.
 */

import { getTodaySaoPaulo, getWeekStartSaoPaulo } from '../utils/timezone.js';

export type QuestScope = 'daily' | 'weekly';

export interface QuestDefinition {
  id: string;
  scope: QuestScope;
  title: string;
  description: string;
  goal: number;
  xp: number;
  /** Pure progress function — receives snapshot-derived counts. */
  progress: (ctx: QuestContext) => number;
}

export interface QuestContext {
  activitiesCompletedToday: number;
  morningComplete: boolean;
  afternoonComplete: boolean;
  eveningComplete: boolean;
  trainedToday: boolean;
  activeDaysThisWeek: number;
  workoutsThisWeek: number;
  streakAtual: number;
}

/** Max XP the daily quest budget can pay per day. */
export const QUEST_DAILY_XP_BUDGET = 30;

/** Max XP the weekly quest budget can pay per week. */
export const QUEST_WEEKLY_XP_BUDGET = 60;

export const QUEST_CATALOG: readonly QuestDefinition[] = [
  // ——— Daily missions ———
  {
    id: 'daily_3_activities',
    scope: 'daily',
    title: 'Tríplice',
    description: 'Conclua 3 atividades hoje',
    goal: 3,
    xp: 10,
    progress: (ctx) => Math.min(ctx.activitiesCompletedToday, 3),
  },
  {
    id: 'daily_morning_block',
    scope: 'daily',
    title: 'Madrugador',
    description: 'Complete o bloco da manhã',
    goal: 1,
    xp: 10,
    progress: (ctx) => (ctx.morningComplete ? 1 : 0),
  },
  {
    id: 'daily_train',
    scope: 'daily',
    title: 'Treino do dia',
    description: 'Faça um treino hoje',
    goal: 1,
    xp: 10,
    progress: (ctx) => (ctx.trainedToday ? 1 : 0),
  },
  // ——— Weekly missions ———
  {
    id: 'weekly_5_active_days',
    scope: 'weekly',
    title: 'Semana forte',
    description: 'Tenha 5 dias ativos esta semana',
    goal: 5,
    xp: 30,
    progress: (ctx) => Math.min(ctx.activeDaysThisWeek, 5),
  },
  {
    id: 'weekly_3_workouts',
    scope: 'weekly',
    title: 'Trio de treinos',
    description: 'Treine 3 vezes esta semana',
    goal: 3,
    xp: 30,
    progress: (ctx) => Math.min(ctx.workoutsThisWeek, 3),
  },
] as const;

// Compile-time budget guard
const dailyTotal = QUEST_CATALOG.filter((q) => q.scope === 'daily').reduce(
  (sum, q) => sum + q.xp,
  0,
);
const weeklyTotal = QUEST_CATALOG.filter((q) => q.scope === 'weekly').reduce(
  (sum, q) => sum + q.xp,
  0,
);

if (dailyTotal > QUEST_DAILY_XP_BUDGET) {
  throw new Error(`Quest daily XP total (${dailyTotal}) exceeds budget (${QUEST_DAILY_XP_BUDGET})`);
}
if (weeklyTotal > QUEST_WEEKLY_XP_BUDGET) {
  throw new Error(
    `Quest weekly XP total (${weeklyTotal}) exceeds budget (${QUEST_WEEKLY_XP_BUDGET})`,
  );
}
/** Chave estável do período em America/Sao_Paulo (mesmo fuso do Dia Ativo). */
export function getQuestPeriodKey(scope: QuestScope, now = new Date()): string {
  if (scope === 'daily') return getTodaySaoPaulo(now);
  return `W${getWeekStartSaoPaulo(now)}`;
}

/**
 * Chaves antigas (UTC / getDay do processo) ainda podem existir em linhas
 * gravadas antes da correção. A listagem aceita ambas para não reabrir missão.
 */
export function getQuestPeriodKeyAliases(scope: QuestScope, now = new Date()): string[] {
  const canonical = getQuestPeriodKey(scope, now);
  const utcDay = now.toISOString().slice(0, 10);
  const utcWeekDate = new Date(now);
  const utcWeekday = utcWeekDate.getUTCDay();
  const utcDiff = utcWeekDate.getUTCDate() - utcWeekday + (utcWeekday === 0 ? -6 : 1);
  utcWeekDate.setUTCDate(utcDiff);
  const legacy =
    scope === 'daily' ? utcDay : `W${utcWeekDate.toISOString().slice(0, 10)}`;
  return legacy === canonical ? [canonical] : [canonical, legacy];
}
