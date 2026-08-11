import { describe, expect, it } from 'vitest';
import {
  computeStreakWithFrozenDays,
  findStreakMissedDaysForFreeze,
  type StreakWorkoutDay,
} from '../../shared/streak/protection.js';
import { addDaysSaoPaulo, getTodaySaoPaulo } from '../../shared/utils/timezone.js';

const today = getTodaySaoPaulo();
const d1 = addDaysSaoPaulo(today, -1); // ontem
const d2 = addDaysSaoPaulo(today, -2); // anteontem
const d3 = addDaysSaoPaulo(today, -3);
const d4 = addDaysSaoPaulo(today, -4);

const workout = (dayKey: string): StreakWorkoutDay => ({ concluido_em: `${dayKey}T12:00:00Z` });

describe('streak frozen-day protection', () => {
  it('cobre ontem quando volta sem treinar hoje', () => {
    expect(findStreakMissedDaysForFreeze([workout(d2)], [], 1)).toEqual([d1]);
  });

  it('ponte: cobre ontem mesmo já tendo treinado hoje na volta', () => {
    expect(findStreakMissedDaysForFreeze([workout(d2), workout(today)], [], 1)).toEqual([d1]);
  });

  it('nao cobre nada se treinou ontem', () => {
    expect(findStreakMissedDaysForFreeze([workout(d1)], [], 1)).toEqual([]);
  });

  it('cobre 2 dias perdidos consecutivos quando há itens suficientes', () => {
    expect(findStreakMissedDaysForFreeze([workout(d3)], [], 2)).toEqual([d1, d2]);
  });

  it('nao cobre 2 dias perdidos se só há 1 item disponível (buraco maior que o limite)', () => {
    expect(findStreakMissedDaysForFreeze([workout(d3)], [], 1)).toEqual([]);
  });

  it('cobre 3 dias perdidos quando há itens de sobra (não consome além do necessário)', () => {
    expect(findStreakMissedDaysForFreeze([workout(d4)], [], 10)).toEqual([d1, d2, d3]);
  });

  it('sem item nenhum (maxFreezes 0), nunca cobre', () => {
    expect(findStreakMissedDaysForFreeze([workout(d2)], [], 0)).toEqual([]);
  });

  it('nao consome de novo dias ja congelados, e nao contam contra o limite', () => {
    // anteontem já estava congelado; só falta cobrir ontem, com 1 item basta.
    expect(findStreakMissedDaysForFreeze([workout(d3)], [d2], 1)).toEqual([d1]);
  });

  it('freeze estende a ofensiva (ponte anteontem -> hoje)', () => {
    const hist = [workout(d2), workout(today)];
    const semFreeze = computeStreakWithFrozenDays(hist, []);
    const comFreeze = computeStreakWithFrozenDays(hist, [d1]);

    expect(semFreeze.atual).toBe(1);
    expect(comFreeze.atual).toBe(2);
    expect(comFreeze.atual).toBeGreaterThan(semFreeze.atual);
  });

  it('freeze de 2 dias estende a ofensiva (ponte 4 dias atrás -> hoje)', () => {
    const hist = [workout(d3), workout(today)];
    const semFreeze = computeStreakWithFrozenDays(hist, []);
    const comFreeze = computeStreakWithFrozenDays(hist, [d1, d2]);

    expect(semFreeze.atual).toBe(1);
    expect(comFreeze.atual).toBe(2);
    expect(comFreeze.atual).toBeGreaterThan(semFreeze.atual);
  });

  it('preserva a maior streak histórica através de vários dias congelados', () => {
    const primeiro = addDaysSaoPaulo(today, -10);
    const segundo = addDaysSaoPaulo(today, -9);
    const congelado1 = addDaysSaoPaulo(today, -8);
    const congelado2 = addDaysSaoPaulo(today, -7);
    const terceiro = addDaysSaoPaulo(today, -6);
    const quarto = addDaysSaoPaulo(today, -5);

    const result = computeStreakWithFrozenDays(
      [workout(primeiro), workout(segundo), workout(terceiro), workout(quarto)],
      [congelado1, congelado2],
    );

    expect(result).toEqual({ atual: 0, maior: 4 });
  });
});
