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
    const match = matchActivityTemplate(input);
    expect(match.template?.name).toBe(expected);
    expect(match.confidence === 'strong' || match.confidence === 'similar').toBe(true);
  });

  it('não força seleção em nome desconhecido', () => {
    expect(matchActivityTemplate('xyzzy')).toEqual({
      template: null,
      score: expect.any(Number),
      confidence: 'none',
    });
    expect(matchActivityTemplate('ab').confidence).toBe('none');
  });

  it('marca correspondência exata como strong', () => {
    expect(matchActivityTemplate('Corrida').confidence).toBe('strong');
  });
});
