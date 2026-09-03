import { describe, expect, it } from 'vitest';
import { matchActivityTemplate } from '../../shared/activities/template-match.js';

describe('matchActivityTemplate', () => {
  it.each([
    ['Corre', 'Corrida'],
    ['Correr', 'Corrida'],
    ['Corrida', 'Corrida'],
    ['Corrida Matinal', 'Corrida'],
    ['Trote', 'Corrida'],
    ['ler', 'Leitura'],
    ['leitura da noite', 'Leitura'],
    ['estudar japonês', 'Estudo'],
    ['meditação', 'Meditação'],
    ['beber água', 'Beber água'],
    ['alongar', 'Alongamento'],
  ])('%s → %s', (input, expected) => {
    expect(matchActivityTemplate(input)?.name).toBe(expected);
  });

  it('não força seleção em nome desconhecido', () => {
    expect(matchActivityTemplate('xyzzy')).toBeNull();
    expect(matchActivityTemplate('ab')).toBeNull();
  });
});
