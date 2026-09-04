import { describe, expect, it } from 'vitest';
import {
  resolveQuestBoardPhase,
  shouldWipeQuestsOnLoadFailure,
} from '../../shared/quests/load-state.js';

describe('quest board load phases', () => {
  it('mostra skeleton só na carga inicial', () => {
    expect(
      resolveQuestBoardPhase({ initialLoading: true, loadError: false, hasQuests: false }),
    ).toBe('skeleton');
  });

  it('refresh com dados mantém content (sem skeleton)', () => {
    expect(
      resolveQuestBoardPhase({ initialLoading: false, loadError: false, hasQuests: true }),
    ).toBe('content');
  });

  it('erro sem dados → error; erro com dados → content', () => {
    expect(
      resolveQuestBoardPhase({ initialLoading: false, loadError: true, hasQuests: false }),
    ).toBe('error');
    expect(
      resolveQuestBoardPhase({ initialLoading: false, loadError: true, hasQuests: true }),
    ).toBe('content');
  });

  it('falha de refresh não limpa lista já carregada', () => {
    expect(
      shouldWipeQuestsOnLoadFailure({ hasLoadedOnce: true, hasQuests: true }),
    ).toBe(false);
    expect(
      shouldWipeQuestsOnLoadFailure({ hasLoadedOnce: false, hasQuests: false }),
    ).toBe(true);
    expect(
      shouldWipeQuestsOnLoadFailure({ hasLoadedOnce: true, hasQuests: false }),
    ).toBe(true);
  });
});
