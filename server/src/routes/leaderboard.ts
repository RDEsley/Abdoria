import { Router } from 'express';
import { User } from '../models/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import type { LeaderboardMetric } from '../types/index.js';
import { LEADERBOARD_DISPLAY_LIMIT, xpLevelFromTotal } from '../types/index.js';
import { readAbdoriaBalance } from '../services/economy.js';
import { syncAbdoriaBalancesForLeaderboard } from '../services/abdoria-leaderboard.js';
import { processWeeklyLeaderboardRewardsIfDue } from '../services/weekly-leaderboard-rewards.js';

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

function metricSort(metric: LeaderboardMetric): Record<string, -1 | 1> {
  if (metric === 'streak') {
    return { 'gamificacao.streak_atual': -1, 'gamificacao.nivel_xp': -1, nome: 1 };
  }
  if (metric === 'moedas') {
    return { 'cosmeticos.moedas': -1, 'gamificacao.nivel_xp': -1, nome: 1 };
  }
  return { 'gamificacao.nivel_xp': -1, 'cosmeticos.moedas': -1, nome: 1 };
}

function metricValue(
  user: {
    gamificacao: { nivel_xp: number; streak_atual: number };
    cosmeticos?: { moedas?: number | null } | null;
  },
  metric: LeaderboardMetric,
): number {
  if (metric === 'streak') return user.gamificacao.streak_atual;
  if (metric === 'moedas') return readAbdoriaBalance(user);
  return user.gamificacao.nivel_xp;
}

function toEntry(
  user: {
    _id: { toString(): string };
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
) {
  return {
    rank,
    user_id: user._id.toString(),
    nome: user.nome,
    nivel_xp: user.gamificacao.nivel_xp,
    level: levelFromXp(user.gamificacao.nivel_xp),
    streak_atual: user.gamificacao.streak_atual,
    moedas: readAbdoriaBalance(user),
    avatar_equipado: user.cosmeticos?.avatar_equipado ?? 'avatar_inicial',
    borda_equipada: user.cosmeticos?.borda_equipada ?? 'borda_basica',
    is_me: isMe,
  };
}

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

async function countUsersAbove(
  metric: LeaderboardMetric,
  user: {
    nome: string;
    gamificacao: { nivel_xp: number; streak_atual: number };
    cosmeticos?: { moedas?: number | null } | null;
  },
): Promise<number> {
  const value = metricValue(user, metric);

  if (metric === 'xp') {
    return User.countDocuments({
      ...leaderboardFilter,
      $or: [
        { 'gamificacao.nivel_xp': { $gt: value } },
        { 'gamificacao.nivel_xp': value, nome: { $lt: user.nome } },
      ],
    });
  }

  if (metric === 'streak') {
    return User.countDocuments({
      ...leaderboardFilter,
      $or: [
        { 'gamificacao.streak_atual': { $gt: value } },
        {
          'gamificacao.streak_atual': value,
          'gamificacao.nivel_xp': { $gt: user.gamificacao.nivel_xp },
        },
      ],
    });
  }

  const moedas = readAbdoriaBalance(user);
  return User.countDocuments({
    ...leaderboardFilter,
    $or: [
      { 'cosmeticos.moedas': { $gt: moedas } },
      {
        'cosmeticos.moedas': moedas,
        'gamificacao.nivel_xp': { $gt: user.gamificacao.nivel_xp },
      },
    ],
  });
}

leaderboardRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const metric = parseMetric(req.query.metric as string | undefined);
    const limit = Math.min(Number(req.query.limit) || LEADERBOARD_DISPLAY_LIMIT, LEADERBOARD_DISPLAY_LIMIT);

    if (metric === 'moedas') {
      await syncAbdoriaBalancesForLeaderboard();
    }
    await processWeeklyLeaderboardRewardsIfDue();

    const users = await User.find(leaderboardFilter)
      .sort(metricSort(metric))
      .limit(limit)
      .select('nome gamificacao.nivel_xp gamificacao.streak_atual cosmeticos.moedas cosmeticos.avatar_equipado cosmeticos.borda_equipada')
      .lean();

    const entries = users.map((user, index) =>
      toEntry(user, index + 1, user._id.toString() === req.userId),
    );

    res.json(entries);
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});

leaderboardRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const metric = parseMetric(req.query.metric as string | undefined);

    if (metric === 'moedas') {
      await syncAbdoriaBalancesForLeaderboard();
    }

    const user = await User.findById(req.userId).lean();
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const above = await countUsersAbove(metric, user);
    res.json(toEntry(user, above + 1, true));
  } catch (error) {
    console.error('GET /api/leaderboard/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar posição.' });
  }
});
