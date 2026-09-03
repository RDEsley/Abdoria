import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  endOfDaySaoPaulo,
  getHourSaoPaulo,
  getTodaySaoPaulo,
  getWeekStartSaoPaulo,
  startOfDaySaoPaulo,
} from '../../shared/utils/timezone.js';

const originalTimeZone = process.env.TZ;

beforeAll(() => {
  // Reproduz o ambiente de Functions/Vercel, onde o fallback antigo usava
  // meia-noite UTC em vez da meia-noite civil de São Paulo.
  process.env.TZ = 'UTC';
});

afterAll(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
});

describe('limites do dia em America/Sao_Paulo', () => {
  it('inclui atividades feitas depois das 21h quando o servidor está em UTC', () => {
    const lateEvening = new Date('2026-08-11T02:34:54.836Z'); // 10/08, 23:34 em SP
    const earlierActivity = new Date('2026-08-10T21:00:00.000Z'); // 10/08, 18:00 em SP

    expect(getTodaySaoPaulo(lateEvening)).toBe('2026-08-10');
    expect(startOfDaySaoPaulo(lateEvening).toISOString()).toBe('2026-08-10T03:00:00.000Z');
    expect(endOfDaySaoPaulo(lateEvening).toISOString()).toBe('2026-08-11T03:00:00.000Z');
    expect(lateEvening >= startOfDaySaoPaulo(lateEvening)).toBe(true);
    expect(lateEvening < endOfDaySaoPaulo(lateEvening)).toBe(true);
    expect(earlierActivity >= startOfDaySaoPaulo(lateEvening)).toBe(true);
    expect(earlierActivity < endOfDaySaoPaulo(lateEvening)).toBe(true);
  });

  it('não preserva minutos, segundos ou milissegundos no início do dia', () => {
    const afternoon = new Date('2026-08-10T15:23:45.678Z');

    expect(startOfDaySaoPaulo(afternoon).toISOString()).toBe('2026-08-10T03:00:00.000Z');
  });

  it('troca o dia exatamente à meia-noite de São Paulo', () => {
    const midnight = new Date('2026-08-11T03:00:00.000Z');

    expect(getTodaySaoPaulo(midnight)).toBe('2026-08-11');
    expect(startOfDaySaoPaulo(midnight).toISOString()).toBe('2026-08-11T03:00:00.000Z');
    expect(endOfDaySaoPaulo(midnight).toISOString()).toBe('2026-08-12T03:00:00.000Z');
  });

  it('getHourSaoPaulo não usa o fuso do processo (momentum manhã/tarde/noite)', () => {
    const nightInSaoPaulo = new Date('2026-09-04T02:30:00.000Z'); // 23:30 em SP
    expect(getHourSaoPaulo(nightInSaoPaulo)).toBe(23);
    expect(nightInSaoPaulo.getHours()).toBe(2);
  });

  it('semana civil Seg–Dom ancora na segunda-feira em SP', () => {
    // 2026-09-03 é quinta.
    expect(getWeekStartSaoPaulo(new Date('2026-09-03T15:00:00-03:00'))).toBe('2026-08-31');
    expect(getWeekStartSaoPaulo(new Date('2026-08-31T08:00:00-03:00'))).toBe('2026-08-31');
    expect(getWeekStartSaoPaulo(new Date('2026-09-06T22:00:00-03:00'))).toBe('2026-08-31');
  });
});
