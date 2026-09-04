import { describe, expect, it } from 'vitest';
import {
  HIDDEN_CREATE_TEMPLATE_IDS,
  activityCreateTemplates,
  findActivityTemplate,
  matchActivityTemplate,
  suggestActivityTemplates,
} from '../../shared/activities/index.js';

describe('activity create catalog', () => {
  it('oculta Respiração, Yoga e Cuidados pessoais do catálogo novo', () => {
    const ids = activityCreateTemplates().map((item) => item.id);
    expect(ids).not.toContain('tpl_respiracao');
    expect(ids).not.toContain('tpl_yoga');
    expect(ids).not.toContain('tpl_cuidados');
    for (const id of HIDDEN_CREATE_TEMPLATE_IDS) {
      expect(findActivityTemplate(id)?.id).toBe(id);
    }
  });

  it('mantém templates legados resolvíveis para activities existentes', () => {
    expect(findActivityTemplate('tpl_respiracao')?.name).toBe('Respiração');
    expect(findActivityTemplate('tpl_yoga')?.name).toBe('Yoga');
    expect(findActivityTemplate('tpl_cuidados')?.name).toBe('Cuidados pessoais');
  });
});

describe('suggestActivityTemplates', () => {
  it.each([
    ['estudar japonês', 'Estudo'],
    ['correr no parque', 'Corrida'],
    ['ler mangá', 'Leitura'],
    ['arrumar meu quarto', 'Organizar o dia'],
  ])('%s → %s entre as sugestões', (input, expected) => {
    const suggestions = suggestActivityTemplates(input, 3);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    expect(suggestions.some((entry) => entry.template.name === expected)).toBe(true);
    expect(matchActivityTemplate(input).template?.name).toBe(expected);
  });

  it('não sugere mais de 3 templates', () => {
    const suggestions = suggestActivityTemplates('estudar revisar aula idioma leitura correr', 3);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it('não inclui templates ocultos nas sugestões', () => {
    const ids = suggestActivityTemplates('yoga respiração skincare', 3).map((s) => s.template.id);
    expect(ids).not.toContain('tpl_yoga');
    expect(ids).not.toContain('tpl_respiracao');
    expect(ids).not.toContain('tpl_cuidados');
  });

  it('não força seleção em nome desconhecido', () => {
    expect(matchActivityTemplate('xyzzy').confidence).toBe('none');
    expect(suggestActivityTemplates('ab')).toEqual([]);
  });
});
