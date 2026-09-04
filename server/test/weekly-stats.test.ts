import { describe, expect, it } from 'vitest';
import type { UserRecord } from '../src/domain/User.js';
import {
  addWeeklyMoedas,
  addWeeklyXp,
  ensureWeekStats,
  getSundayWeekKey,
  weeklyMetricValue,
} from '../src/services/weekly-stats.js';

function fakeUser(overrides: Partial<UserRecord['gamificacao']> = {}): UserRecord {
  return {
    id: 'user-1',
    is_demo_npc: false,
    gamificacao: { nivel_xp: 0, streak_atual: 0, streak_maior: 0, ...overrides },
  } as unknown as UserRecord;
}

// Chaves dinâmicas: addWeeklyXp/addWeeklyMoedas acumulam na semana REAL
// corrente — chaves fixas quebravam o teste na primeira virada de semana.
const CURRENT_WEEK = getSundayWeekKey();
const PREVIOUS_WEEK = getSundayWeekKey(new Date(Date.now() - 7 * 86_400_000));

describe('weekly-stats', () => {
  it('cria acumuladores zerados na primeira semana', () => {
    const user = fakeUser();
    const stats = ensureWeekStats(user, CURRENT_WEEK);
    expect(stats).toEqual({ week_key: CURRENT_WEEK, xp: 0, moedas: 0 });
  });

  it('acumula ganhos de XP e Folhas na semana corrente', () => {
    const user = fakeUser();
    ensureWeekStats(user, CURRENT_WEEK);
    addWeeklyXp(user, 40);
    addWeeklyXp(user, 10);
    addWeeklyMoedas(user, 7);
    expect(weeklyMetricValue(user, 'xp', CURRENT_WEEK)).toBe(50);
    expect(weeklyMetricValue(user, 'moedas', CURRENT_WEEK)).toBe(7);
  });

  it('vira a semana preservando a anterior em week_stats_prev', () => {
    const user = fakeUser();
    ensureWeekStats(user, PREVIOUS_WEEK);
    user.gamificacao.week_stats!.xp = 120;
    ensureWeekStats(user, CURRENT_WEEK);

    expect(user.gamificacao.week_stats).toEqual({ week_key: CURRENT_WEEK, xp: 0, moedas: 0 });
    expect(user.gamificacao.week_stats_prev).toEqual({
      week_key: PREVIOUS_WEEK,
      xp: 120,
      moedas: 0,
    });
    // O payout da semana fechada ainda enxerga o valor antigo.
    expect(weeklyMetricValue(user, 'xp', PREVIOUS_WEEK)).toBe(120);
    expect(weeklyMetricValue(user, 'xp', CURRENT_WEEK)).toBe(0);
  });

  it('retorna zero pra semanas sem registro', () => {
    const user = fakeUser();
    expect(weeklyMetricValue(user, 'xp', '2026-07-05')).toBe(0);
    expect(weeklyMetricValue(user, 'moedas', '2026-07-05')).toBe(0);
  });

  it('retorna zero quando não há acumulador', () => {
    const empty = { id: 'u-empty', gamificacao: {} } as unknown as UserRecord;
    const a = weeklyMetricValue(empty, 'xp', '2026-07-05');
    const b = weeklyMetricValue(empty, 'xp', '2026-07-05');
    const otherWeek = weeklyMetricValue(empty, 'xp', '2026-07-12');
    expect(a).toBe(b);
    expect(a).toBe(0);
    expect(otherWeek).toBe(0);
  });

  it('getSundayWeekKey ancora no domingo', () => {
    // 2026-07-10 é sexta (SP); domingo anterior = 2026-07-05.
    expect(getSundayWeekKey(new Date('2026-07-10T15:00:00-03:00'))).toBe('2026-07-05');
    expect(getSundayWeekKey(new Date('2026-07-05T08:00:00-03:00'))).toBe('2026-07-05');
  });
});
