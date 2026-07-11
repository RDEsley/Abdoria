import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import type { LeaderboardMetric } from '../types/index.js';
import { LEADERBOARD_DISPLAY_LIMIT, xpLevelFromTotal } from '../types/index.js';
import { readAbdoriaBalance } from '../services/economy.js';
import { syncAbdoriaBalancesForLeaderboard } from '../services/abdoria-leaderboard.js';
import { processWeeklyLeaderboardRewardsIfDue } from '../services/weekly-leaderboard-rewards.js';
import { weeklyMetricValue } from '../services/weekly-stats.js';
import { LeaderboardPodiumHistory } from '../repositories/leaderboard-podium-repository.js';

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth);

function levelFromXp(xp: number): number {
  return xpLevelFromTotal(xp);
}

function parseMetric(raw: string | undefined): LeaderboardMetric {
  if (raw === 'streak') return 'streak';
  if (raw === 'moedas' || raw === 'abdoria') return 'moedas';
  return 'xp';
}

function metricSort(metric: LeaderboardMetric): Record<string, 1 | -1> {
  if (metric === 'streak') {
    return { 'gamificacao.streak_atual': -1 };
  }
  if (metric === 'moedas') {
    return { 'cosmeticos.moedas': -1 };
  }
  return { 'gamificacao.nivel_xp': -1 };
}

function toEntry(
  user: {
    id: string;
    nome: string;
    gamificacao: { nivel_xp: number; streak_atual: number };
    cosmeticos?: {
      moedas?: number | null;
      avatar_equipado?: string | null;
      borda_equipada?: string | null;
    } | null;
  },
  rank: number,
  isMe: boolean,
  weekValue: number | null = null,
) {
  return {
    rank,
    user_id: user.id,
    nome: user.nome,
    nivel_xp: user.gamificacao.nivel_xp,
    level: levelFromXp(user.gamificacao.nivel_xp),
    streak_atual: user.gamificacao.streak_atual,
    moedas: readAbdoriaBalance(user),
    week_value: weekValue,
    avatar_equipado: user.cosmeticos?.avatar_equipado ?? 'avatar_inicial',
    borda_equipada: user.cosmeticos?.borda_equipada ?? 'borda_basica',
    is_me: isMe,
  };
}

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

leaderboardRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const metric = parseMetric(req.query.metric as string | undefined);
    const limit = Math.min(
      Number(req.query.limit) || LEADERBOARD_DISPLAY_LIMIT,
      LEADERBOARD_DISPLAY_LIMIT,
    );

    if (metric === 'moedas') {
      await syncAbdoriaBalancesForLeaderboard();
    }
    await processWeeklyLeaderboardRewardsIfDue();

    if (metric === 'streak') {
      const users = await User.find(leaderboardFilter, {
        sort: metricSort(metric),
        limit,
      });
      res.json(users.map((user, index) => toEntry(user, index + 1, user.id === req.userId)));
      return;
    }

    // XP e Dorias são semanais: ordena pelo acumulado da semana corrente.
    const all = await User.find(leaderboardFilter);
    const ranked = all
      .map((user) => ({ user, value: weeklyMetricValue(user, metric) }))
      .sort((a, b) => b.value - a.value || a.user.nome.localeCompare(b.user.nome, 'pt-BR'))
      .slice(0, limit);

    res.json(
      ranked.map(({ user, value }, index) =>
        toEntry(user, index + 1, user.id === req.userId, value),
      ),
    );
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});

/** Quantas vezes o usuário fechou a semana em 1º/2º/3º (base das molduras de perfil). */
leaderboardRouter.get('/podium/me', async (req: AuthRequest, res) => {
  try {
    const counts = await LeaderboardPodiumHistory.countsForUser(req.userId!);
    res.json(counts);
  } catch (error) {
    console.error('GET /api/leaderboard/podium/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de pódio.' });
  }
});

leaderboardRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const metric = parseMetric(req.query.metric as string | undefined);

    if (metric === 'moedas') {
      await syncAbdoriaBalancesForLeaderboard();
    }

    const user = await User.findById(req.userId!, { lean: true });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (metric === 'streak') {
      const rank = await User.countLeaderboardRank(user, metric);
      res.json(toEntry(user, rank, true));
      return;
    }

    const all = await User.find(leaderboardFilter);
    const myValue = weeklyMetricValue(user, metric);
    const rank =
      all.filter((other) => {
        if (other.id === user.id) return false;
        const otherValue = weeklyMetricValue(other, metric);
        return (
          otherValue > myValue ||
          (otherValue === myValue && other.nome.localeCompare(user.nome, 'pt-BR') < 0)
        );
      }).length + 1;

    res.json(toEntry(user, rank, true, myValue));
  } catch (error) {
    console.error('GET /api/leaderboard/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar posição.' });
  }
});
