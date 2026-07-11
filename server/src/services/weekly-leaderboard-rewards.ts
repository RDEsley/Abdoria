import type { LeaderboardMetric } from '../types/index.js';
import { LeaderboardWeekPayout } from '../repositories/leaderboard-payout-repository.js';
import {
  LeaderboardPodiumHistory,
  type PodiumHistoryEntry,
} from '../repositories/leaderboard-podium-repository.js';
import { User, type UserMutable } from '../repositories/user-repository.js';
import { Notifications, type NewNotification } from '../repositories/notification-repository.js';
import { CURRENCY_NAME } from '../types/index.js';
import { ensureAbdoriaWallet } from './economy.js';
import { getSundayWeekKey, weeklyMetricValue } from './weekly-stats.js';

export { getSundayWeekKey };

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

/** Só XP e Dorias fecham semana — o ranking de streak é fixo e sem prêmio. */
const WEEKLY_METRICS: Exclude<LeaderboardMetric, 'streak'>[] = ['xp', 'moedas'];

function prizeForRank(rank: number): number {
  if (rank === 1) return 1000;
  if (rank === 2) return 700;
  if (rank === 3) return 300;
  return 100;
}

function payoutKey(weekKey: string, metric: LeaderboardMetric): string {
  return `${weekKey}:${metric}`;
}

/**
 * Fecha a semana anterior dos rankings de XP e Dorias: paga 1000/700/300/100
 * Dorias por posição e grava o pódio no histórico (base das molduras).
 * Roda no primeiro acesso ao ranking após a virada (domingo SP) — idempotente
 * por semana e métrica, então não depende de alguém abrir exatamente no domingo.
 * O prêmio é creditado direto na carteira, sem contar como ganho da semana nova.
 */
export async function processWeeklyLeaderboardRewardsIfDue(): Promise<number> {
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

    const all = await User.find(leaderboardFilter);
    const ranked = all
      .map((user) => ({ user, value: weeklyMetricValue(user, metric, payoutWeek) }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value || a.user.nome.localeCompare(b.user.nome, 'pt-BR'));

    const podium: PodiumHistoryEntry[] = [];
    const avisos: NewNotification[] = [];
    const metricLabel = metric === 'xp' ? 'XP' : CURRENCY_NAME;

    for (let i = 0; i < ranked.length; i += 1) {
      const rank = i + 1;
      const { user: lean } = ranked[i];
      if (rank <= 3) {
        podium.push({
          user_id: lean.id,
          week_key: payoutWeek,
          metric,
          position: rank as 1 | 2 | 3,
        });
      }
      // NPCs demo ocupam posição no ranking mas não recebem prêmio.
      if (lean.is_demo_npc) continue;

      const prize = prizeForRank(rank);
      const user = await User.findById(lean.id);
      if (!user) continue;
      ensureAbdoriaWallet(user);
      user.cosmeticos.moedas += prize;
      await user.save();
      paidCount += 1;

      avisos.push({
        user_id: lean.id,
        tipo: rank <= 3 ? 'ranking_podio' : 'ranking_premio',
        titulo:
          rank <= 3
            ? `Você fechou a semana em ${rank}º no ranking de ${metricLabel}!`
            : `Ranking semanal de ${metricLabel} fechou`,
        corpo: `Posição #${rank} — prêmio de ${prize.toLocaleString('pt-BR')} ${CURRENCY_NAME} creditado.`,
        payload: { metric, rank, prize, week_key: payoutWeek },
      });
    }

    await LeaderboardPodiumHistory.createMany(podium);
    await Notifications.createMany(avisos);
    await LeaderboardWeekPayout.create({ _id: key });
  }

  await LeaderboardWeekPayout.create({ _id: runKey });
  return paidCount;
}

export type { UserMutable };
