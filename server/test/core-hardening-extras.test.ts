import { describe, expect, it } from 'vitest';
import { createFullscreenCelebrationCoordinator } from '../../shared/celebrations/fullscreen-slot.js';
import {
  computeRankAmongPopulation,
  filterRankingPopulation,
  isHiddenAdmin,
} from '../src/services/leaderboard-filter.js';

describe('fullscreen celebration coordinator', () => {
  it('never runs two full-screen slots at once; respects priority', async () => {
    const slot = createFullscreenCelebrationCoordinator();
    await slot.acquire('cosmetic');
    expect(slot.getActive()).toBe('cosmetic');

    let levelReady = false;
    let streakReady = false;
    const levelP = slot.acquire('level_up').then(() => {
      levelReady = true;
    });
    const streakP = slot.acquire('streak').then(() => {
      streakReady = true;
    });

    expect(levelReady).toBe(false);
    expect(streakReady).toBe(false);

    slot.release('cosmetic');
    await Promise.resolve();
    // streak tem prioridade sobre level_up
    expect(slot.getActive()).toBe('streak');
    expect(streakReady).toBe(true);
    expect(levelReady).toBe(false);

    slot.release('streak');
    await levelP;
    expect(slot.getActive()).toBe('level_up');
    expect(levelReady).toBe(true);
    await streakP;
  });
});

describe('leaderboard population', () => {
  const base = {
    gamificacao: { nivel_xp: 100, streak_atual: 1, streak_maior: 5 },
  };

  it('hides admin unless admin_visivel_ranking', () => {
    expect(
      isHiddenAdmin({ role: 'admin', preferencias: { admin_visivel_ranking: false } }),
    ).toBe(true);
    expect(
      isHiddenAdmin({ role: 'admin', preferencias: { admin_visivel_ranking: true } }),
    ).toBe(false);
    expect(isHiddenAdmin({ role: 'user' })).toBe(false);
  });

  it('returns null rank for hidden admin instead of fake #1 of 1', () => {
    const admin = {
      id: 'admin-1',
      nome: 'Admin',
      role: 'admin',
      preferencias: { admin_visivel_ranking: false },
      ...base,
    };
    const other = {
      id: 'u2',
      nome: 'User',
      role: 'user',
      preferencias: {},
      gamificacao: { nivel_xp: 50, streak_atual: 1, streak_maior: 2 },
    };
    const result = computeRankAmongPopulation([admin, other], admin, (u) => u.gamificacao.nivel_xp);
    expect(result.hidden_from_ranking).toBe(true);
    expect(result.rank).toBeNull();
    expect(result.total).toBe(1);
    expect(filterRankingPopulation([admin, other])).toHaveLength(1);
  });
});
