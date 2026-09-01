import { describe, expect, it } from 'vitest';
import {
  AFK_FROZEN_STREAK_DAILY_THRESHOLD,
  rollDailyFrozenStreak,
} from '../../shared/afk/frozen-streak-drop.js';
import { rollLootTable } from '../src/services/afk-rolls.js';
import type { UserRecord } from '../src/types/user-record.js';
import type { AfkPendingReward } from '../../shared/types/index.js';

function emptyPending(): AfkPendingReward {
  return {
    xp: 0,
    abdoria: 0,
    frozen_streaks: 0,
    route_drinks: 0,
    cosmetic_ids: [],
    weapon_ids: [],
    exp_instant: 0,
    doria_bags: 0,
    material_items: {},
    titulo_secreto: false,
    drop_count: 0,
  };
}

const user = {
  id: 'frozen-balance-test',
  preferencias: {},
  cosmeticos: { desbloqueados: [] },
} as unknown as UserRecord;

describe('Frozen Streak da exploração', () => {
  it('usa uma única rolagem diária determinística de 15%', () => {
    expect(AFK_FROZEN_STREAK_DAILY_THRESHOLD).toBe(1500);
    const day = '2026-08-10';
    expect(rollDailyFrozenStreak(String(user.id), day)).toBe(
      rollDailyFrozenStreak(String(user.id), day),
    );
  });

  it('mantém a distribuição próxima de 15% em uma amostra ampla', () => {
    let hits = 0;
    const sampleSize = 10_000;
    for (let index = 0; index < sampleSize; index += 1) {
      if (rollDailyFrozenStreak(`user-${index}`, `2026-08-${(index % 28) + 1}`)) hits += 1;
    }
    expect(hits / sampleSize).toBeGreaterThan(0.13);
    expect(hits / sampleSize).toBeLessThan(0.17);
  });

  it('não permite Frozen Streak nas tabelas repetíveis de elite ou boss', () => {
    for (let index = 0; index < 2_000; index += 1) {
      const elitePending = emptyPending();
      const bossPending = emptyPending();
      rollLootTable(user, index, elitePending, { tier: 'elite' });
      rollLootTable(user, index, bossPending, { tier: 'boss', chapter: 6 });
      expect(elitePending.frozen_streaks).toBe(0);
      expect(bossPending.frozen_streaks).toBe(0);
    }
  });
});
