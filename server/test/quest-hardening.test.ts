import { describe, expect, it } from 'vitest';
import {
  findQuestDefinition,
  materializeQuest,
  QUEST_TEMPLATE_POOL,
  resolveAssignedQuests,
  selectQuestsForUser,
  type QuestContext,
  type QuestDefinition,
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
    ...partial,
  };
}

describe('scheduled quest progress', () => {
  it('daily_scheduled_activity requires scheduledActivityCompletedToday', () => {
    const quest = QUEST_TEMPLATE_POOL.find((q) => q.id === 'daily_scheduled_activity')!;
    expect(quest.progress(ctx({ activitiesCompletedToday: 5 }))).toBe(0);
    expect(quest.progress(ctx({ scheduledActivityCompletedToday: 1 }))).toBe(1);
  });

  it('daily_routine_scheduled requires scheduledRoutineCompletedToday', () => {
    const quest = QUEST_TEMPLATE_POOL.find((q) => q.id === 'daily_routine_scheduled')!;
    expect(quest.progress(ctx({ routinesCompletedToday: 2 }))).toBe(0);
    expect(quest.progress(ctx({ scheduledRoutineCompletedToday: 1 }))).toBe(1);
  });
});

describe('monthly reachable goals', () => {
  it('caps monthly_workouts_plan by remaining capacity', () => {
    const template = QUEST_TEMPLATE_POOL.find((q) => q.id === 'monthly_workouts_plan')!;
    const late = ctx({
      dayOfMonth: 28,
      daysRemainingInMonth: 2,
      workoutsThisMonth: 3,
      weeklyTrainingDays: 5,
    });
    const materialized = materializeQuest(template, late);
    expect(materialized.goal).toBeLessThanOrEqual(3 + 2);
    expect(materialized.goal).toBeGreaterThanOrEqual(3);
  });

  it('fallback monthly never exceeds reachable active days', () => {
    const late = ctx({ dayOfMonth: 29, daysRemainingInMonth: 1, activeDaysThisMonth: 2 });
    const selected = selectQuestsForUser('late-user', late);
    expect(selected.some((q) => q.id === 'monthly_20_active_days')).toBe(false);
    expect(selected.some((q) => q.id === 'monthly_15_active_days')).toBe(false);
    const monthly = selected.find((q) => q.scope === 'monthly')!;
    expect(monthly).toBeTruthy();
    if (monthly.id.includes('active')) {
      expect(monthly.goal).toBeLessThanOrEqual(2 + 1);
    }
  });
});

describe('assigned-only resolution', () => {
  it('findQuestDefinition does not fall back to full pool', () => {
    const assigned: QuestDefinition[] = resolveAssignedQuests(
      ['daily_1_activity', 'daily_2_activities', 'daily_train'],
      ctx(),
    );
    expect(findQuestDefinition('daily_3_activities', assigned)).toBeUndefined();
    expect(findQuestDefinition('daily_1_activity', assigned)?.id).toBe('daily_1_activity');
  });

  it('resolveAssignedQuests keeps frozen goal overrides', () => {
    const resolved = resolveAssignedQuests(
      ['monthly_workouts_plan'],
      ctx({ workoutsThisMonth: 10, daysRemainingInMonth: 1 }),
      { monthly_workouts_plan: 7 },
    );
    expect(resolved[0]?.goal).toBe(7);
  });
});
