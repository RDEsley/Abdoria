import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  endOfDaySaoPaulo,
  getTodaySaoPaulo,
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
});
