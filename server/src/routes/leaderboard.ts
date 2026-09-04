import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import type { LeaderboardMetric } from '../types/index.js';
import { LEADERBOARD_DISPLAY_LIMIT, xpLevelFromTotal } from '../types/index.js';
import { readLifetimeMoedas, readMoedaBalance } from '../services/economy.js';
import { syncMoedaBalancesForLeaderboard } from '../services/moeda-leaderboard.js';
import {
  LeaderboardPodiumHistory,
  type PodiumCounts,
} from '../repositories/leaderboard-podium-repository.js';
import type { MolduraId } from '../types/index.js';
import {
  LEADERBOARD_BASE_FILTER,
  computeRankAmongPopulation,
  filterRankingPopulation,
} from '../services/leaderboard-filter.js';

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

/** Valor vitalício da métrica: XP, Folhas recebidas ou recorde de streak. */
function globalMetricValue(
  user: EntryUser,
  metric: LeaderboardMetric,
): number {
  if (metric === 'xp') return user.gamificacao.nivel_xp;
  if (metric === 'streak') return user.gamificacao.streak_maior;
  return readLifetimeMoedas(user);
}

function metricSort(metric: LeaderboardMetric): Record<string, 1 | -1> {
  if (metric === 'streak') return { 'gamificacao.streak_maior': -1 };
  if (metric === 'moedas') return { 'cosmeticos.moedas_total_ganhas': -1 };
  return { 'gamificacao.nivel_xp': -1 };
}

type EntryUser = {
  id: string;
  nome: string;
  avatar_url?: string | null;
  role?: string | null;
  preferencias?: { admin_visivel_ranking?: boolean } | null;
  gamificacao: { nivel_xp: number; streak_atual: number; streak_maior: number };
  cosmeticos?: {
    moedas?: number | null;
    moldura_loja_equipada?: string | null;
    moldura_equipada?: MolduraId | null;
    borda_perfil_fonte?: 'podio' | 'loja' | null;
    banner_equipado?: string | null;
  } | null;
};

function molduraCountFor(counts: PodiumCounts | undefined, moldura: MolduraId): number {
  if (!counts) return 0;
  if (moldura === 'ouro') return counts.first;
  if (moldura === 'prata') return counts.second;
  if (moldura === 'bronze') return counts.third;
  return 0;
}

function toEntry(
  user: EntryUser,
  rank: number,
  isMe: boolean,
  weekValue: number | null = null,
  podium?: PodiumCounts,
) {
  const moldura = user.cosmeticos?.moldura_equipada ?? null;
  return {
    rank,
    user_id: user.id,
    nome: user.nome,
    nivel_xp: user.gamificacao.nivel_xp,
    level: levelFromXp(user.gamificacao.nivel_xp),
    streak_atual: user.gamificacao.streak_atual,
    moedas: readMoedaBalance(user),
    week_value: weekValue,
    avatar_url: user.avatar_url ?? null,
    moldura_loja_equipada: user.cosmeticos?.moldura_loja_equipada ?? 'borda_basica',
    moldura_equipada: moldura,
    borda_perfil_fonte: user.cosmeticos?.borda_perfil_fonte ?? undefined,
    banner_equipado: user.cosmeticos?.banner_equipado ?? 'fundo_padrao',
    moldura_count: moldura && moldura !== 'especial' ? molduraCountFor(podium, moldura) : null,
    is_me: isMe,
  };
}

leaderboardRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const metric = parseMetric(req.query.metric as string | undefined);
    const limit = Math.min(
      Number(req.query.limit) || LEADERBOARD_DISPLAY_LIMIT,
      LEADERBOARD_DISPLAY_LIMIT,
    );

    if (metric === 'moedas') {
      await syncMoedaBalancesForLeaderboard();
    }

    const fetched = await User.find(LEADERBOARD_BASE_FILTER, {
      sort: metricSort(metric),
      limit: limit + 10,
    });
    const users = filterRankingPopulation(fetched).slice(0, limit);
    const podiums = await LeaderboardPodiumHistory.countsForUsers(
      users.filter((u) => u.cosmeticos?.moldura_equipada).map((u) => u.id),
    );
    res.json(
      users.map((user, index) =>
        toEntry(
          user,
          index + 1,
          user.id === req.userId,
          globalMetricValue(user, metric),
          podiums.get(user.id),
        ),
      ),
    );
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});

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
      await syncMoedaBalancesForLeaderboard();
    }

    const user = await User.findById(req.userId!, { lean: true });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const myPodium = user.cosmeticos?.moldura_equipada
      ? (await LeaderboardPodiumHistory.countsForUsers([user.id])).get(user.id)
      : undefined;

    const all = await User.find(LEADERBOARD_BASE_FILTER);
    const myValue = globalMetricValue(user, metric);
    const { rank, total, hidden_from_ranking } = computeRankAmongPopulation(
      all,
      user,
      (entry) => globalMetricValue(entry, metric),
    );

    if (hidden_from_ranking || rank == null) {
      res.json({
        ...toEntry(user, 0, true, myValue, myPodium),
        rank: null,
        total,
        hidden_from_ranking: true,
      });
      return;
    }

    res.json({ ...toEntry(user, rank, true, myValue, myPodium), total });
  } catch (error) {
    console.error('GET /api/leaderboard/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar posição.' });
  }
});
