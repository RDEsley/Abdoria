import { describe, expect, it } from 'vitest';
import { computePersonalRecords, diffNewPersonalRecords } from '../../shared/personal-records.js';
import type { WorkoutExerciseEntry } from '../../shared/types/index.js';

function repsExercise(overrides: Partial<WorkoutExerciseEntry> = {}): WorkoutExerciseEntry {
  return {
    exercicio_id: 'ex-1',
    slug: 'prancha-abdominal',
    nome: 'Prancha Abdominal',
    duracao_segundos: 36,
    musculo_principal: 'core',
    series: 3,
    repeticoes_realizadas: 12,
    modo: 'reps',
    descanso_seg: 30,
    ...overrides,
  };
}

function tempoExercise(overrides: Partial<WorkoutExerciseEntry> = {}): WorkoutExerciseEntry {
  return {
    exercicio_id: 'ex-2',
    slug: 'prancha-isometrica',
    nome: 'Prancha Isométrica',
    duracao_segundos: 45,
    musculo_principal: 'core',
    series: 3,
    modo: 'tempo',
    descanso_seg: 30,
    ...overrides,
  };
}

describe('personal records — volume por exercício', () => {
  it('modo reps: volume = série × repetições realizadas', () => {
    const records = computePersonalRecords([
      {
        exercicios: [repsExercise({ series: 3, repeticoes_realizadas: 10 })],
        concluido_em: '2026-01-01',
      },
    ]);
    expect(records.get('prancha-abdominal')?.melhor_valor).toBe(30);
    expect(records.get('prancha-abdominal')?.unidade).toBe('reps');
  });

  it('modo tempo: volume = série × duração segurada', () => {
    const records = computePersonalRecords([
      {
        exercicios: [tempoExercise({ series: 2, duracao_segundos: 40 })],
        concluido_em: '2026-01-01',
      },
    ]);
    expect(records.get('prancha-isometrica')?.melhor_valor).toBe(80);
    expect(records.get('prancha-isometrica')?.unidade).toBe('segundos');
  });

  it('mantém o maior volume entre várias sessões', () => {
    const records = computePersonalRecords([
      {
        exercicios: [repsExercise({ series: 3, repeticoes_realizadas: 10 })],
        concluido_em: '2026-01-01',
      },
      {
        exercicios: [repsExercise({ series: 4, repeticoes_realizadas: 12 })],
        concluido_em: '2026-01-05',
      },
      {
        exercicios: [repsExercise({ series: 2, repeticoes_realizadas: 8 })],
        concluido_em: '2026-01-10',
      },
    ]);
    expect(records.get('prancha-abdominal')?.melhor_valor).toBe(48);
  });

  it('não dispara PR na primeira vez que o exercício é feito', () => {
    const previous = computePersonalRecords([]);
    const notices = diffNewPersonalRecords(previous, [
      repsExercise({ series: 3, repeticoes_realizadas: 10 }),
    ]);
    expect(notices).toHaveLength(0);
  });

  it('dispara PR quando supera o recorde anterior', () => {
    const previous = computePersonalRecords([
      {
        exercicios: [repsExercise({ series: 3, repeticoes_realizadas: 10 })],
        concluido_em: '2026-01-01',
      },
    ]);
    const notices = diffNewPersonalRecords(previous, [
      repsExercise({ series: 4, repeticoes_realizadas: 10 }),
    ]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      slug: 'prancha-abdominal',
      valor_anterior: 30,
      valor_novo: 40,
      unidade: 'reps',
    });
  });

  it('não dispara PR quando o volume é igual ou menor que o recorde', () => {
    const previous = computePersonalRecords([
      {
        exercicios: [repsExercise({ series: 3, repeticoes_realizadas: 10 })],
        concluido_em: '2026-01-01',
      },
    ]);
    const notices = diffNewPersonalRecords(previous, [
      repsExercise({ series: 3, repeticoes_realizadas: 10 }),
    ]);
    expect(notices).toHaveLength(0);
  });
});
