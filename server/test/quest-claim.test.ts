import { describe, expect, it, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();

vi.mock('../src/db.js', () => ({
  getSupabase: () => ({ from, rpc }),
}));

const saveColumns = vi.fn();
const fakeUser = {
  id: 'user-1',
  gamificacao: { nivel_xp: 100, week_stats: { week_key: '2026-08-30', xp: 0, moedas: 0 } },
  cosmeticos: { moedas: 0, moedas_xp_blocos: 0, moedas_total_ganhas: 0, desbloqueados: [] },
  saveColumns,
};

vi.mock('../src/domain/User.js', () => ({
  User: { findById: vi.fn(async () => fakeUser) },
  sanitizeUser: (user: typeof fakeUser) => user,
}));

const { claimQuest, listQuestsForUser } = await import('../src/services/quests.js');

const tripliceContext = {
  activitiesCompletedToday: 3,
  activitiesCompletedThisWeek: 3,
  activitiesCompletedThisMonth: 3,
  routinesCompletedToday: 0,
  routinesCompletedThisWeek: 0,
  routinesCompletedThisMonth: 0,
  morningComplete: false,
  afternoonComplete: false,
  eveningComplete: false,
  trainedToday: false,
  trainingDayToday: false,
  weeklyTrainingDays: 0,
  activeDaysThisWeek: 1,
  activeDaysThisMonth: 1,
  workoutsThisWeek: 0,
  workoutsThisMonth: 0,
  hasRoutines: false,
  hasRoutineScheduledToday: false,
  hasActivities: true,
  hasScheduledActivityToday: false,
  categoriesToday: new Set<string>(),
  categoriesUsed: new Set(['mente']),
  menteCompletedToday: 0,
  corpoCompletedToday: 0,
  vidaCompletedToday: 0,
  distinctCategoriesThisWeek: 1,
  daysRemainingInMonth: 20,
  dayOfMonth: 10,
  streakAtual: 1,
};

function chainResult(result: { data?: unknown; error?: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(async () => result),
  };
  return query;
}

describe('claimQuest Tríplice', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    saveColumns.mockReset();
    fakeUser.gamificacao.nivel_xp = 100;
    saveColumns.mockResolvedValue(fakeUser);
  });

  it('coleta Tríplice 3/3 e credita XP uma vez', async () => {
    from.mockReturnValue(chainResult({ data: [], error: null }));
    rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_quest_slot') {
        return { data: { already_rewarded: false, xp_awarded: 10 }, error: null };
      }
      return { data: null, error: null };
    });

    const result = await claimQuest('user-1', 'daily_3_activities', tripliceContext);
    expect(result.xp_ganho).toBe(10);
    expect(fakeUser.gamificacao.nivel_xp).toBe(110);
    expect(saveColumns).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'mark_quest_rewarded',
      expect.objectContaining({ p_quest_id: 'daily_3_activities' }),
    );
  });

  it('rejeita claim duplicado no mesmo período', async () => {
    from.mockReturnValue(
      chainResult({
        data: [{ period_key: '2026-09-03', rewarded_at: '2026-09-03T12:00:00.000Z', xp_awarded: 10 }],
        error: null,
      }),
    );

    await expect(claimQuest('user-1', 'daily_3_activities', tripliceContext)).rejects.toThrow(
      /já coletada/i,
    );
    expect(saveColumns).not.toHaveBeenCalled();
  });

  it('completa recompensa pendente (claim fantasma) em vez de duplicar', async () => {
    from.mockReturnValue(
      chainResult({
        data: [{ period_key: '2026-09-03', rewarded_at: null, xp_awarded: 10 }],
        error: null,
      }),
    );
    rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_quest_slot') {
        return { data: { already_rewarded: false, xp_awarded: 10 }, error: null };
      }
      return { data: null, error: null };
    });

    const result = await claimQuest('user-1', 'daily_3_activities', tripliceContext);
    expect(result.xp_ganho).toBe(10);
    expect(rpc).toHaveBeenCalledWith(
      'claim_quest_slot',
      expect.objectContaining({ p_period_key: '2026-09-03' }),
    );
  });

  it('não coleta Tríplice com progresso 2/3', async () => {
    await expect(
      claimQuest('user-1', 'daily_3_activities', { ...tripliceContext, activitiesCompletedToday: 2 }),
    ).rejects.toThrow(/não concluída/i);
  });

  it('listQuestsForUser propaga erro do Supabase', async () => {
    from.mockReturnValue(
      chainResult({ data: null, error: { message: 'permission denied', code: '42501' } }),
    );
    await expect(listQuestsForUser('user-1', tripliceContext)).rejects.toThrow(/permission denied/);
  });
});
