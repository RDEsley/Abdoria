import { describe, expect, it } from 'vitest';
import {
  QUEST_DAILY_COUNT,
  QUEST_DAILY_XP_BUDGET,
  QUEST_MONTHLY_COUNT,
  QUEST_MONTHLY_XP_BUDGET,
  QUEST_TEMPLATE_POOL,
  QUEST_WEEKLY_COUNT,
  QUEST_WEEKLY_XP_BUDGET,
  getQuestPeriodKey,
  selectQuestsForUser,
  type QuestContext,
} from '../../shared/quests/catalog.js';

function ctx(partial: Partial<QuestContext> = {}): QuestContext {
  return {
    activitiesCompletedToday: 0,
    activitiesCompletedThisWeek: 0,
    activitiesCompletedThisMonth: 0,
    routinesCompletedToday: 0,
    routinesCompletedThisWeek: 0,
    routinesCompletedThisMonth: 0,
    scheduledActivityCompletedToday: 0,
    scheduledRoutineCompletedToday: 0,
    morningComplete: false,
    afternoonComplete: false,
    eveningComplete: false,
    trainedToday: false,
    trainingDayToday: true,
    weeklyTrainingDays: 3,
    activeDaysThisWeek: 2,
    activeDaysThisMonth: 8,
    workoutsThisWeek: 1,
    workoutsThisMonth: 4,
    hasRoutines: true,
    hasRoutineScheduledToday: true,
    hasActivities: true,
    hasScheduledActivityToday: true,
    categoriesToday: new Set(['mente']),
    categoriesUsed: new Set(['mente', 'corpo', 'vida']),
    menteCompletedToday: 0,
    corpoCompletedToday: 0,
    vidaCompletedToday: 0,
    distinctCategoriesThisWeek: 2,
    daysRemainingInMonth: 20,
    dayOfMonth: 10,
    streakAtual: 3,
    nutritionSetup: false,
    mealsLoggedToday: 0,
    nutritionDaysThisWeek: 0,
    nutritionDaysThisMonth: 0,
    recipesLoggedThisWeek: 0,
    ...partial,
  };
}

describe('quest selection', () => {
  it('returns stable daily/weekly/monthly counts within budgets', () => {
    const selected = selectQuestsForUser('user-a', ctx());
    expect(selected.filter((q) => q.scope === 'daily')).toHaveLength(QUEST_DAILY_COUNT);
    expect(selected.filter((q) => q.scope === 'weekly')).toHaveLength(QUEST_WEEKLY_COUNT);
    expect(selected.filter((q) => q.scope === 'monthly')).toHaveLength(QUEST_MONTHLY_COUNT);
    expect(selected.filter((q) => q.scope === 'daily').reduce((s, q) => s + q.xp, 0)).toBeLessThanOrEqual(
      QUEST_DAILY_XP_BUDGET,
    );
    expect(selected.filter((q) => q.scope === 'weekly').reduce((s, q) => s + q.xp, 0)).toBeLessThanOrEqual(
      QUEST_WEEKLY_XP_BUDGET,
    );
    expect(selected.filter((q) => q.scope === 'monthly').reduce((s, q) => s + q.xp, 0)).toBeLessThanOrEqual(
      QUEST_MONTHLY_XP_BUDGET,
    );
  });

  it('keeps the same missions for the same user and day', () => {
    const now = new Date('2026-09-04T15:00:00-03:00');
    const a = selectQuestsForUser('user-stable', ctx(), now).map((q) => q.id);
    const b = selectQuestsForUser('user-stable', ctx({ activitiesCompletedToday: 2 }), now).map(
      (q) => q.id,
    );
    expect(a).toEqual(b);
  });

  it('varies by user id', () => {
    const now = new Date('2026-09-04T15:00:00-03:00');
    const a = selectQuestsForUser('user-1', ctx(), now).map((q) => q.id);
    const b = selectQuestsForUser('user-2', ctx(), now).map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('does not offer impossible monthly 20-day goal near month end', () => {
    const late = ctx({ dayOfMonth: 28, daysRemainingInMonth: 2, activeDaysThisMonth: 5 });
    const selected = selectQuestsForUser('user-late', late);
    expect(selected.some((q) => q.id === 'monthly_20_active_days')).toBe(false);
    expect(selected.some((q) => q.id === 'monthly_15_active_days')).toBe(false);
    const monthly = selected.find((q) => q.scope === 'monthly');
    expect(monthly).toBeTruthy();
  });

  it('builds monthly period keys as MYYYY-MM', () => {
    expect(getQuestPeriodKey('monthly', new Date('2026-09-04T12:00:00-03:00'))).toBe('M2026-09');
  });

  it('avoids routine missions when user has no routines', () => {
    const selected = selectQuestsForUser(
      'no-routines',
      ctx({ hasRoutines: false, hasRoutineScheduledToday: false }),
    );
    expect(selected.some((q) => q.id.includes('routine'))).toBe(false);
  });

  it('nutrition meal quest only when setup is complete', () => {
    const meal = QUEST_TEMPLATE_POOL.find((q) => q.id === 'daily_nutrition_meal')!;
    expect(meal.eligible?.(ctx({ nutritionSetup: false }))).toBe(false);
    expect(meal.eligible?.(ctx({ nutritionSetup: true }))).toBe(true);
    expect(meal.progress(ctx({ mealsLoggedToday: 1 }))).toBe(1);
  });

  it('prefers mixed domains for daily when nutrition is eligible', () => {
    const now = new Date('2026-09-04T15:00:00-03:00');
    const selected = selectQuestsForUser(
      'domain-mix-user',
      ctx({
        nutritionSetup: true,
        trainingDayToday: true,
        weeklyTrainingDays: 3,
        hasActivities: true,
      }),
      now,
    ).filter((q) => q.scope === 'daily');
    const domains = new Set(
      selected.map((q) => QUEST_TEMPLATE_POOL.find((t) => t.id === q.id)?.domain ?? 'general'),
    );
    expect(domains.size).toBeGreaterThanOrEqual(2);
  });
});
