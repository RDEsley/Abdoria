import type { LeaderboardMetric } from '../types/index.js';
import { LeaderboardWeekPayout } from '../repositories/leaderboard-payout-repository.js';
import { User, type UserMutable } from '../repositories/user-repository.js';
import { getSaoPauloWeekday, getTodaySaoPaulo } from '../utils/timezone.js';
import { grantAbdoria } from './economy.js';

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

const WEEKLY_METRICS: LeaderboardMetric[] = ['xp', 'streak', 'moedas'];

/** Chave da semana que termina no domingo (início domingo em SP). */
export function getSundayWeekKey(date = new Date()): string {
  const today = getTodaySaoPaulo(date);
  const weekday = getSaoPauloWeekday(date);
  const [y, m, d] = today.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() - weekday);
  const yy = anchor.getUTCFullYear();
  const mm = String(anchor.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anchor.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function prizeForRank(rank: number): number {
  if (rank === 1) return 15;
  if (rank === 2) return 10;
  if (rank === 3) return 5;
  if (rank <= 25) return 3;
  return 0;
}

function metricSort(metric: LeaderboardMetric): Record<string, 1 | -1> {
  if (metric === 'streak') return { 'gamificacao.streak_atual': -1 };
  if (metric === 'moedas') return { 'cosmeticos.moedas': -1 };
  return { 'gamificacao.nivel_xp': -1 };
}

function payoutKey(weekKey: string, metric: LeaderboardMetric): string {
  return `${weekKey}:${metric}`;
}

/** Paga prêmios do top 25 na virada de semana (domingo SP). Idempotente por semana e métrica. */
export async function processWeeklyLeaderboardRewardsIfDue(): Promise<number> {
  const weekday = getSaoPauloWeekday();
  if (weekday !== 0) return 0;

  const currentWeek = getSundayWeekKey();
  const runKey = `${currentWeek}:__run__`;
  if (await LeaderboardWeekPayout.findById(runKey)) return 0;

  const prev = new Date();
  prev.setDate(prev.getDate() - 7);
  const payoutWeek = getSundayWeekKey(prev);

  let paidCount = 0;

  for (const metric of WEEKLY_METRICS) {
    const key = payoutKey(payoutWeek, metric);
    if (await LeaderboardWeekPayout.findById(key)) continue;

    const topLean = await User.find(leaderboardFilter, {
      sort: metricSort(metric),
      limit: 25,
    });

    for (let i = 0; i < topLean.length; i += 1) {
      const prize = prizeForRank(i + 1);
      if (prize <= 0) continue;
      const user = await User.findById(topLean[i].id);
      if (!user) continue;
      grantAbdoria(user, prize);
      await user.save();
      paidCount += 1;
    }

    await LeaderboardWeekPayout.create({ _id: key });
  }

  await LeaderboardWeekPayout.create({ _id: runKey });
  return paidCount;
}

export type { UserMutable };
