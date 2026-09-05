import { describe, expect, it } from 'vitest';
import { ACTIVE_DAY_SOURCES } from '../../shared/active-day.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import {
  deriveNutritionReminders,
  normalizeReminderSource,
  reminderDeepLinkUrl,
} from '../../shared/reminders.js';
import { QUEST_TEMPLATE_POOL } from '../../shared/quests/catalog.js';

describe('active day nutrition source', () => {
  it('includes nutrition in ACTIVE_DAY_SOURCES', () => {
    expect(ACTIVE_DAY_SOURCES).toContain('nutrition');
  });
});

describe('nutrition achievements catalog', () => {
  it('registers the four nutrition achievement ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain('nutrition_first_meal');
    expect(ids).toContain('nutrition_7_days');
    expect(ids).toContain('nutrition_first_recipe');
    expect(ids).toContain('nutrition_recipe_5');
  });
});

describe('nutrition quest templates', () => {
  it('adds nutrition quests without removing existing pool size floor', () => {
    const ids = QUEST_TEMPLATE_POOL.map((q) => q.id);
    expect(ids).toContain('daily_nutrition_meal');
    expect(ids).toContain('weekly_nutrition_3_days');
    expect(ids).toContain('weekly_nutrition_recipe');
    expect(ids).toContain('monthly_nutrition_10_days');
    expect(QUEST_TEMPLATE_POOL.length).toBeGreaterThanOrEqual(20);
  });
});

describe('deriveNutritionReminders', () => {
  it('builds stable nutrition:meal ids from preferences', () => {
    const derived = deriveNutritionReminders(
      [
        {
          meal_type: 'lunch',
          label: 'Almoço',
          time: '12:30',
          weekdays: [1, 2, 3, 4, 5],
          enabled: true,
        },
        {
          meal_type: 'breakfast',
          label: 'Café',
          time: 'bad',
          weekdays: [1],
          enabled: true,
        },
        {
          meal_type: 'dinner',
          label: 'Jantar',
          time: '20:00',
          weekdays: [0, 6],
          enabled: false,
        },
      ],
      '2026-09-04T12:00:00.000Z',
    );
    expect(derived).toHaveLength(1);
    expect(derived[0]?.id).toBe('nutrition:meal:lunch');
    expect(derived[0]?.schedule).toEqual({
      kind: 'recurring',
      times: ['12:30'],
      weekdays: [1, 2, 3, 4, 5],
    });
  });
});

describe('normalizeReminderSource', () => {
  it('classifies personal, activity, routine and nutrition ids', () => {
    expect(normalizeReminderSource('abc-uuid')).toBe('personal');
    expect(normalizeReminderSource('activity:1:08:00')).toBe('activity');
    expect(normalizeReminderSource('routine:2:09:00')).toBe('routine');
    expect(normalizeReminderSource('nutrition:meal:lunch')).toBe('nutrition');
    expect(reminderDeepLinkUrl('nutrition:meal:lunch')).toBe(
      '/alimentacao?acao=registrar&refeicao=lunch',
    );
  });
});
