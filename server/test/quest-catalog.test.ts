import { describe, expect, it } from 'vitest';
import {
  QUEST_CATALOG,
  QUEST_DAILY_XP_BUDGET,
  QUEST_WEEKLY_XP_BUDGET,
} from '../../shared/quests/catalog.js';

describe('quest catalog budget', () => {
  it('daily XP never exceeds the daily budget', () => {
    const total = QUEST_CATALOG.filter((q) => q.scope === 'daily').reduce(
      (sum, q) => sum + q.xp,
      0,
    );
    expect(total).toBeLessThanOrEqual(QUEST_DAILY_XP_BUDGET);
  });

  it('weekly XP never exceeds the weekly budget', () => {
    const total = QUEST_CATALOG.filter((q) => q.scope === 'weekly').reduce(
      (sum, q) => sum + q.xp,
      0,
    );
    expect(total).toBeLessThanOrEqual(QUEST_WEEKLY_XP_BUDGET);
  });
});
