import { describe, expect, it } from 'vitest';
import {
  computeStreakWithFrozenDays,
  findStreakMissedDayForFreeze,
  type StreakWorkoutDay,
} from '../../shared/streak/protection.js';
import { addDaysSaoPaulo, getTodaySaoPaulo } from '../../shared/utils/timezone.js';

const today = getTodaySaoPaulo();
const d1 = addDaysSaoPaulo(today, -1); // ontem
const d2 = addDaysSaoPaulo(today, -2); // anteontem
const d3 = addDaysSaoPaulo(today, -3);

const workout = (dayKey: string): StreakWorkoutDay => ({ concluido_em: `${dayKey}T12:00:00Z` });

describe('streak frozen-day protection', () => {
  it('cobre ontem quando volta sem treinar hoje', () => {
    expect(findStreakMissedDayForFreeze([workout(d2)], [])).toBe(d1);
  });

  it('ponte: cobre ontem mesmo já tendo treinado hoje na volta', () => {
    expect(findStreakMissedDayForFreeze([workout(d2), workout(today)], [])).toBe(d1);
  });

  it('nao cobre nada se treinou ontem', () => {
    expect(findStreakMissedDayForFreeze([workout(d1)], [])).toBeNull();
  });

  it('nao cobre se ha 2+ dias perdidos (fora do alcance do freeze)', () => {
    expect(findStreakMissedDayForFreeze([workout(d3)], [])).toBeNull();
  });

  it('nao consome de novo se ontem ja esta congelado', () => {
    expect(findStreakMissedDayForFreeze([workout(d2)], [d1])).toBeNull();
  });

  it('freeze estende a ofensiva (ponte anteontem -> hoje)', () => {
    const hist = [workout(d2), workout(today)];
    const semFreeze = computeStreakWithFrozenDays(hist, []);
    const comFreeze = computeStreakWithFrozenDays(hist, [d1]);

    expect(semFreeze.atual).toBe(1);
    expect(comFreeze.atual).toBe(2);
    expect(comFreeze.atual).toBeGreaterThan(semFreeze.atual);
  });
});
