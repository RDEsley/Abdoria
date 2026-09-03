import { ACTIVITY_TEMPLATES, type ActivityTemplate } from './templates.js';

const MIN_SCORE = 4;

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
  return best;
}

export function matchActivityTemplate(name: string): ActivityTemplate | null {
  const query = fold(name);
  if (query.length < 3) return null;
  const queryTokens = tokens(query);
  let winner: ActivityTemplate | null = null;
  let best = 0;
  for (const template of ACTIVITY_TEMPLATES) {
    const score = scoreTemplate(query, queryTokens, template);
    if (score > best) {
      best = score;
      winner = template;
    }
  }
  return best >= MIN_SCORE ? winner : null;
}
