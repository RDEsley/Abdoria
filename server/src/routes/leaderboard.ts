import { Router } from 'express';
import { User } from '../models/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth);

function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

leaderboardRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const metric = (req.query.metric as string) === 'streak' ? 'streak' : 'xp';
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const sortField =
      metric === 'streak'
        ? ({ 'gamificacao.streak_atual': -1 } as Record<string, -1>)
        : ({ 'gamificacao.nivel_xp': -1 } as Record<string, -1>);

    const users = await User.find({
      onboarding_completed: true,
      is_guest: { $ne: true },
    })
      .sort(sortField)
      .limit(limit)
      .select('nome gamificacao.nivel_xp gamificacao.streak_atual')
      .lean();

    const entries = users.map((u, i) => ({
      rank: i + 1,
      user_id: u._id.toString(),
      nome: u.nome,
      nivel_xp: u.gamificacao.nivel_xp,
      level: levelFromXp(u.gamificacao.nivel_xp),
      streak_atual: u.gamificacao.streak_atual,
      is_me: u._id.toString() === req.userId,
    }));

    res.json(entries);
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});

leaderboardRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const metric = (req.query.metric as string) === 'streak' ? 'streak' : 'xp';
    const field = metric === 'streak' ? 'gamificacao.streak_atual' : 'gamificacao.nivel_xp';
    const value = metric === 'streak'
      ? user.gamificacao.streak_atual
      : user.gamificacao.nivel_xp;

    const above = await User.countDocuments({
      onboarding_completed: true,
      is_guest: { $ne: true },
      [field]: { $gt: value },
    });

    res.json({
      rank: above + 1,
      user_id: user._id.toString(),
      nome: user.nome,
      nivel_xp: user.gamificacao.nivel_xp,
      level: levelFromXp(user.gamificacao.nivel_xp),
      streak_atual: user.gamificacao.streak_atual,
      is_me: true,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar posição.' });
  }
});
