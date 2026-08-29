import { describe, expect, it } from 'vitest';
import { applyStreakRecoveryAnchor } from '../../shared/streak/recovery.js';

describe('streak recovery persistente', () => {
  it('mantém a recuperação após novo /stats no mesmo dia', () => {
    expect(
      applyStreakRecoveryAnchor({ recovered_at: '2026-08-29', base_streak: 7 }, [], '2026-08-29'),
    ).toEqual({ streak: 7, active: true });
  });
  it('continua crescendo quando todos os dias seguintes têm atividade', () => {
    expect(
      applyStreakRecoveryAnchor(
        { recovered_at: '2026-08-27', base_streak: 7 },
        ['2026-08-28', '2026-08-29'],
        '2026-08-29',
      ),
    ).toEqual({ streak: 9, active: true });
  });
  it('expira após uma quebra futura verdadeira', () => {
    expect(
      applyStreakRecoveryAnchor({ recovered_at: '2026-08-27', base_streak: 7 }, [], '2026-08-29'),
    ).toEqual({ streak: 0, active: false });
  });
});
