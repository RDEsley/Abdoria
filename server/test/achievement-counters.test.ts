import { describe, expect, it } from 'vitest';
import { splitHistorySessions } from '../../shared/atividades.js';

describe('contadores de conquistas treino vs atividade', () => {
  it('identifica atividade pela coluna, não pelo prefixo do nome', () => {
    const histories = [
      {
        treino_nome: 'Treino A',
        atividade: null,
        duracao_total_segundos: 1800,
        exercicios: [{}, {}],
      },
      {
        treino_nome: 'Atividade: Leitura',
        atividade: { atividade_id: 'atv_leitura' },
        duracao_total_segundos: 3600,
        exercicios: [],
      },
      {
        treino_nome: 'Atividade: Estudo',
        atividade: null,
        duracao_total_segundos: 600,
        exercicios: [],
      },
    ];

    const { workouts, activities } = splitHistorySessions(histories);
    const workoutMinutes = Math.floor(
      workouts.reduce((sum, h) => sum + (h.duracao_total_segundos ?? 0), 0) / 60,
    );

    expect(activities).toHaveLength(1);
    expect(workouts).toHaveLength(2);
    expect(workoutMinutes).toBe(40);
    expect(activities[0]?.treino_nome).toBe('Atividade: Leitura');
  });
});
