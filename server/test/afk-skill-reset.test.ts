import { describe, expect, it } from 'vitest';
import { DEFAULT_AFK_COMBAT } from '../src/types/index.js';
import type { UserRecord } from '../src/types/user-record.js';
import { resetAfkSkillTree } from '../src/services/afk-adventure.js';

function fakeUser(options: { coins?: number; gems?: number; freeResetUsed?: boolean } = {}) {
  return {
    id: 'skill-reset-user',
    gamificacao: { nivel_xp: 0 },
    cosmeticos: {
      moedas: options.coins ?? 0,
      moedas_xp_blocos: 0,
      moedas_total_ganhas: options.coins ?? 0,
    },
    gems: options.gems ?? 0,
    afk: {
      last_seen_at: null,
      paused_at: null,
      minutos_acumulados: 0,
      pending: {},
      combat: {
        ...DEFAULT_AFK_COMBAT,
        orbs: 2,
        skill_nodes: ['core_instinct', 'bow_focus_1'],
        skill_tree_free_reset_used: options.freeResetUsed ?? false,
      },
    },
  } as unknown as UserRecord;
}

describe('Árvore de habilidades — reset', () => {
  it('torna o primeiro reset gratuito mesmo se o cliente enviar uma moeda paga', () => {
    const user = fakeUser({ coins: 0, gems: 0 });

    const result = resetAfkSkillTree(user, 'gems');

    expect(result).toEqual({ ok: true, payment: 'free' });
    expect(user.gems).toBe(0);
    expect(user.cosmeticos.moedas).toBe(0);
    expect(user.afk.combat?.skill_nodes).toEqual([]);
    expect(user.afk.combat?.orbs).toBe(4);
    expect(user.afk.combat?.skill_tree_free_reset_used).toBe(true);
  });

  it('cobra normalmente a partir do segundo reset', () => {
    const user = fakeUser({ coins: 5_000, freeResetUsed: true });

    const result = resetAfkSkillTree(user, 'coins');

    expect(result).toEqual({ ok: true, payment: 'coins' });
    expect(user.cosmeticos.moedas).toBe(0);
    expect(user.afk.combat?.skill_nodes).toEqual([]);
    expect(user.afk.combat?.orbs).toBe(4);
  });

  it('não remove habilidades quando o pagamento de um reset posterior falha', () => {
    const user = fakeUser({ coins: 4_999, freeResetUsed: true });

    const result = resetAfkSkillTree(user, 'coins');

    expect(result).toEqual({ ok: false, error: 'Coins insuficientes.' });
    expect(user.cosmeticos.moedas).toBe(4_999);
    expect(user.afk.combat?.skill_nodes).toEqual(['core_instinct', 'bow_focus_1']);
    expect(user.afk.combat?.orbs).toBe(2);
  });
});
