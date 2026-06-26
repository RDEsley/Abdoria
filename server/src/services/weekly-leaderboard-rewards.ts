import { LeaderboardWeekPayout } from '../repositories/leaderboard-payout-repository.js';
import { User, type UserMutable } from '../repositories/user-repository.js';
import { getSaoPauloWeekday, getTodaySaoPaulo } from '../utils/timezone.js';
import { grantAbdoria } from './economy.js';

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

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

/** Paga prêmios do top 25 na virada de semana (domingo SP). Idempotente por semana. */
export async function processWeeklyLeaderboardRewardsIfDue(): Promise<number> {
  const weekday = getSaoPauloWeekday();
  if (weekday !== 0) return 0;

  const currentWeek = getSundayWeekKey();
  const existing = await LeaderboardWeekPayout.findById(currentWeek);
  if (existing) return 0;

  const prev = new Date();
  prev.setDate(prev.getDate() - 7);
  const payoutWeek = getSundayWeekKey(prev);

  const alreadyPaid = await LeaderboardWeekPayout.findById(payoutWeek);
  if (alreadyPaid) {
    await LeaderboardWeekPayout.create({ _id: currentWeek });
    return 0;
  }

  const topLean = await User.find(leaderboardFilter, {
    sort: { 'gamificacao.nivel_xp': -1 },
    limit: 25,
  });

  let paidCount = 0;
  for (let i = 0; i < topLean.length; i += 1) {
    const prize = prizeForRank(i + 1);
    if (prize <= 0) continue;
    const user = await User.findById(topLean[i].id);
    if (!user) continue;
    grantAbdoria(user, prize);
    await user.save();
    paidCount += 1;
  }

  await LeaderboardWeekPayout.create({ _id: payoutWeek });
  await LeaderboardWeekPayout.create({ _id: currentWeek });
  return paidCount;
}

export type { UserMutable };
