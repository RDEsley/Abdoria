import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

/**
 * Impede regressão: activity-quick-card é estrutura de swipe da Activity,
 * não design token genérico para Routine / NextUp.
 */
describe('card structural namespaces', () => {
  it('ActivityQuickCard owns activity-quick-card + surface', () => {
    const source = readSrc('client/src/features/activities/ActivityQuickCard.tsx');
    expect(source).toContain('activity-quick-card');
    expect(source).toContain('activity-quick-card__surface');
  });

  it('SortableRoutineCard uses routine-card, not activity-quick-card', () => {
    const source = readSrc('client/src/features/activities/RoutinesTab.tsx');
    expect(source).toContain('routine-card');
    expect(source).toContain('routine-card__body');
    expect(source).toContain('routine-card__handle');
    expect(source).not.toMatch(/activity-quick-card/);
  });

  it('NextUp GuideCard uses next-up-card, not activity-quick-card', () => {
    const source = readSrc('client/src/features/home/NextUp.tsx');
    expect(source).toContain('next-up-card');
    expect(source).toContain('next-up-card__icon');
    expect(source).toContain('next-up-card__body');
    expect(source).toContain('next-up-card__cta');
    expect(source).not.toMatch(/activity-quick-card/);
  });

  it('missions track allows vertical pan and blocks primary nav swipe', () => {
    const css = readSrc('client/src/styles/quests.css');
    const tsx = readSrc('client/src/components/quests/QuestCard.tsx');
    expect(css).toMatch(/touch-action:\s*pan-x\s+pan-y/);
    expect(tsx).toContain('data-no-nav-swipe');
    expect(tsx).toContain('Não foi possível carregar suas missões');
    expect(tsx).toContain('missions-board__skeleton-pane');
  });

  it('Activity details expose explicit close control', () => {
    const source = readSrc('client/src/features/activities/ActivityDetailsSheet.tsx');
    expect(source).toContain('Fechar detalhes');
    expect(source).toContain('activity-details-header__close');
  });
});
