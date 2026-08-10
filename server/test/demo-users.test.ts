import { describe, expect, it } from 'vitest';
import { DEMO_USERS } from '../src/db/seeds/demo-users.js';

describe('usuários fictícios da seed', () => {
  it('não cria streak nem conquistas de streak para os NPCs', () => {
    expect(DEMO_USERS).toHaveLength(100);

    for (const user of DEMO_USERS) {
      expect(user.gamificacao.streak_atual).toBe(0);
      expect(user.gamificacao.streak_maior).toBe(0);
      expect(user.gamificacao.conquistas.some((id) => id.startsWith('streak_'))).toBe(false);
    }
  });
});
