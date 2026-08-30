import { describe, expect, it } from 'vitest';
import { applyStreakRecoveryAnchor, buildStreakRecordMatch } from '../../shared/streak/recovery.js';

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

  it('mantém o streak igualado ao recorde após novos syncs e login', () => {
    const match = buildStreakRecordMatch(3, 12, '2026-08-29');
    expect(match).toEqual({
      streak: 12,
      anchor: { recovered_at: '2026-08-29', base_streak: 12 },
    });
    expect(applyStreakRecoveryAnchor(match?.anchor, [], '2026-08-29')).toEqual({
      streak: 12,
      active: true,
    });
  });

  it('não cria uma segunda cobrança quando o recorde já foi igualado', () => {
    expect(buildStreakRecordMatch(12, 12, '2026-08-29')).toBeNull();
    expect(buildStreakRecordMatch(13, 12, '2026-08-29')).toBeNull();
  });

  it('desconta o custo uma única vez em chamadas sequenciais', () => {
    let current = 3;
    let leaves = 20_000;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const match = buildStreakRecordMatch(current, 12, '2026-08-29');
      if (!match) continue;
      leaves -= 10_000;
      current = match.streak;
    }
    expect(current).toBe(12);
    expect(leaves).toBe(10_000);
  });

  it('permite uma quebra real futura depois de igualar ao recorde', () => {
    const match = buildStreakRecordMatch(3, 12, '2026-08-27');
    expect(applyStreakRecoveryAnchor(match?.anchor, [], '2026-08-29')).toEqual({
      streak: 0,
      active: false,
    });
  });
});
