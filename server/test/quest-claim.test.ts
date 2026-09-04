import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getQuestPeriodKey } from '../../shared/quests/catalog.js';

const rpc = vi.fn();
const from = vi.fn();

vi.mock('../src/db.js', () => ({
  getSupabase: () => ({ from, rpc }),
}));

const saveColumns = vi.fn();
const fakeUser = {
  id: 'user-1',
  gamificacao: {
    nivel_xp: 110,
    week_stats: { week_key: '2026-08-30', xp: 0, moedas: 0 },
  },
  cosmeticos: { moedas: 0, moedas_xp_blocos: 11, moedas_total_ganhas: 0, desbloqueados: [] },
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
  scheduledActivityCompletedToday: 0,
  scheduledRoutineCompletedToday: 0,
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

function makeQuery(result: { data?: unknown; error?: unknown }) {
  const query: Record<string, unknown> = {};
  const terminal = Promise.resolve(result);
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.upsert = vi.fn(() => query);
  query.maybeSingle = vi.fn(() => terminal);
  // Allow `await query` after .in/.eq chains
  (query as { then: typeof terminal.then }).then = terminal.then.bind(terminal);
  return query;
}

function stubTables(opts: {
  assignments?: unknown;
  claims?: unknown;
  assignmentError?: unknown;
  claimsError?: unknown;
}) {
  const now = new Date();
  const daily = getQuestPeriodKey('daily', now);
  const weekly = getQuestPeriodKey('weekly', now);
  const monthly = getQuestPeriodKey('monthly', now);
  const defaultAssignments = [
    {
      period_key: daily,
      scope: 'daily',
      quest_ids: ['daily_3_activities', 'daily_1_activity', 'daily_2_activities'],
      goal_overrides: {},
    },
    {
      period_key: weekly,
      scope: 'weekly',
      quest_ids: ['weekly_3_active_days', 'weekly_soft_active'],
      goal_overrides: {},
    },
    {
      period_key: monthly,
      scope: 'monthly',
      quest_ids: ['monthly_soft_active'],
      goal_overrides: { monthly_soft_active: 5 },
    },
  ];

  from.mockImplementation((table: string) => {
    if (table === 'quest_assignments') {
      return makeQuery({
        data: opts.assignments ?? defaultAssignments,
        error: opts.assignmentError ?? null,
      });
    }
    return makeQuery({
      data: opts.claims ?? [],
      error: opts.claimsError ?? null,
    });
  });
}

describe('claimQuest hardening', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    saveColumns.mockReset();
    fakeUser.gamificacao.nivel_xp = 110;
    saveColumns.mockResolvedValue(fakeUser);
    stubTables({});
  });

  it('coleta missão assigned e credita XP uma vez via RPC atômico', async () => {
    rpc.mockResolvedValue({
      data: { status: 'awarded', xp_awarded: 10, moedas_ganhas: 0 },
      error: null,
    });

    const result = await claimQuest('user-1', 'daily_3_activities', tripliceContext);
    expect(result.xp_ganho).toBe(10);
    expect(rpc).toHaveBeenCalledWith(
      'claim_quest_reward',
      expect.objectContaining({ p_quest_id: 'daily_3_activities', p_xp: 10 }),
    );
    expect(rpc).not.toHaveBeenCalledWith('mark_quest_rewarded', expect.anything());
  });

  it('rejeita quest do catálogo não assigned', async () => {
    const now = new Date();
    stubTables({
      assignments: [
        {
          period_key: getQuestPeriodKey('daily', now),
          scope: 'daily',
          quest_ids: ['daily_1_activity', 'daily_2_activities', 'daily_train'],
          goal_overrides: {},
        },
        {
          period_key: getQuestPeriodKey('weekly', now),
          scope: 'weekly',
          quest_ids: ['weekly_3_active_days', 'weekly_soft_active'],
          goal_overrides: {},
        },
        {
          period_key: getQuestPeriodKey('monthly', now),
          scope: 'monthly',
          quest_ids: ['monthly_soft_active'],
          goal_overrides: {},
        },
      ],
    });

    await expect(claimQuest('user-1', 'daily_3_activities', tripliceContext)).rejects.toThrow(
      /não encontrada/i,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejeita claim já recompensado no lookup', async () => {
    stubTables({
      claims: [
        {
          period_key: getQuestPeriodKey('daily'),
          rewarded_at: '2026-09-03T12:00:00.000Z',
          xp_awarded: 10,
        },
      ],
    });

    await expect(claimQuest('user-1', 'daily_3_activities', tripliceContext)).rejects.toThrow(
      /já coletada/i,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('retry após already_rewarded do RPC não duplica XP', async () => {
    rpc.mockResolvedValue({
      data: { status: 'already_rewarded', xp_awarded: 10, moedas_ganhas: 0 },
      error: null,
    });

    await expect(claimQuest('user-1', 'daily_3_activities', tripliceContext)).rejects.toThrow(
      /já coletada/i,
    );
    expect(saveColumns).not.toHaveBeenCalled();
  });

  it('duas requests concorrentes: só a primeira premia (RPC exactly-once)', async () => {
    let calls = 0;
    rpc.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        return { data: { status: 'awarded', xp_awarded: 10, moedas_ganhas: 0 }, error: null };
      }
      return { data: { status: 'already_rewarded', xp_awarded: 10, moedas_ganhas: 0 }, error: null };
    });

    const [a, b] = await Promise.allSettled([
      claimQuest('user-1', 'daily_3_activities', tripliceContext),
      claimQuest('user-1', 'daily_3_activities', tripliceContext),
    ]);
    const awarded = [a, b].filter((r) => r.status === 'fulfilled');
    const rejected = [a, b].filter((r) => r.status === 'rejected');
    expect(awarded).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(saveColumns).toHaveBeenCalledTimes(1);
  });

  it('rejeita 4ª daily fora do assignment (máx 3)', async () => {
    await expect(claimQuest('user-1', 'daily_train', tripliceContext)).rejects.toThrow(
      /não encontrada/i,
    );
  });

  it('não coleta Tríplice com progresso 2/3', async () => {
    await expect(
      claimQuest('user-1', 'daily_3_activities', { ...tripliceContext, activitiesCompletedToday: 2 }),
    ).rejects.toThrow(/não concluída/i);
  });

  it('listQuestsForUser propaga erro do Supabase', async () => {
    stubTables({ assignmentError: { message: 'permission denied', code: '42501' } });
    await expect(listQuestsForUser('user-1', tripliceContext)).rejects.toThrow(/permission denied/);
  });
});
