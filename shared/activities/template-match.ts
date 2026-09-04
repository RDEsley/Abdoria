import {
  activityCreateTemplates,
  type ActivityTemplate,
} from './templates.js';

const STRONG_SCORE = 9;
const SIMILAR_SCORE = 4;
const MAX_SUGGESTIONS = 3;

export type TemplateMatchConfidence = 'strong' | 'similar' | 'none';

export interface TemplateMatchResult {
  template: ActivityTemplate | null;
  score: number;
  confidence: TemplateMatchConfidence;
}

export interface TemplateSuggestion {
  template: ActivityTemplate;
  score: number;
  confidence: 'strong' | 'similar';
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return fold(value)
    .split(' ')
    .filter((token) => token.length >= 2);
}

/** Sinônimos / frases compostas que reforçam um template sem depender só de aliases. */
const EXTRA_PHRASES: Array<{ templateId: string; phrases: string[] }> = [
  { templateId: 'tpl_estudo', phrases: ['estudar japones', 'aprender japones', 'aula de'] },
  { templateId: 'tpl_leitura', phrases: ['ler manga', 'ler livro', 'ler hq'] },
  { templateId: 'tpl_corrida', phrases: ['correr no parque', 'corrida no parque', 'fazer cardio'] },
  {
    templateId: 'tpl_organizar',
    phrases: ['arrumar meu quarto', 'arrumar o quarto', 'organizar o quarto', 'limpar o quarto'],
  },
  { templateId: 'tpl_cama', phrases: ['arrumar a cama', 'fazer a cama'] },
];

function scoreTemplate(query: string, queryTokens: string[], template: ActivityTemplate): number {
  const names = [template.name, ...(template.aliases ?? [])].map(fold);
  let best = 0;
  for (const name of names) {
    if (!name) continue;
    if (query === name) best = Math.max(best, 12);
    else if (query.startsWith(name) || name.startsWith(query)) best = Math.max(best, 9);
    else if (query.includes(name) || name.includes(query)) best = Math.max(best, 7);
    const nameTokens = tokens(name);
    const overlap = queryTokens.filter((token) =>
      nameTokens.some((entry) => token === entry || token.startsWith(entry) || entry.startsWith(token)),
    ).length;
    if (overlap > 0) best = Math.max(best, 3 + overlap * 2);
  }

  for (const entry of EXTRA_PHRASES) {
    if (entry.templateId !== template.id) continue;
    for (const phrase of entry.phrases) {
      const folded = fold(phrase);
      if (query === folded) best = Math.max(best, 12);
      else if (query.includes(folded) || folded.includes(query)) best = Math.max(best, 10);
    }
  }

  // Instrumentos / prática livre: não força template — score baixo deixe "Livre".
  if (
    template.id === 'tpl_estudo' &&
    /\b(violino|piano|guitarra|violao|flauta|instrumento|praticar)\b/.test(query)
  ) {
    best = Math.max(best, 5);
  }

  return best;
}

function confidenceFor(score: number): TemplateMatchConfidence {
  if (score >= STRONG_SCORE) return 'strong';
  if (score >= SIMILAR_SCORE) return 'similar';
  return 'none';
}

/** Ranking determinístico das melhores sugestões (máx. 3) do catálogo de criação. */
export function suggestActivityTemplates(
  name: string,
  limit = MAX_SUGGESTIONS,
): TemplateSuggestion[] {
  const query = fold(name);
  if (query.length < 3) return [];
  const queryTokens = tokens(query);
  const ranked = activityCreateTemplates()
    .map((template) => ({
      template,
      score: scoreTemplate(query, queryTokens, template),
    }))
    .filter((entry) => entry.score >= SIMILAR_SCORE)
    .sort(
      (a, b) =>
        b.score - a.score || a.template.name.localeCompare(b.template.name, 'pt-BR'),
    )
    .slice(0, Math.max(0, limit));

  return ranked.map((entry) => ({
    template: entry.template,
    score: entry.score,
    confidence: confidenceFor(entry.score) === 'strong' ? 'strong' : 'similar',
  }));
}

export function matchActivityTemplate(name: string): TemplateMatchResult {
  const suggestions = suggestActivityTemplates(name, 1);
  const top = suggestions[0];
  if (!top) return { template: null, score: 0, confidence: 'none' };
  return {
    template: top.template,
    score: top.score,
    confidence: top.confidence,
  };
}
