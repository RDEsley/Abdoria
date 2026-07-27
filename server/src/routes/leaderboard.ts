import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import type { LeaderboardMetric } from '../types/index.js';
import { LEADERBOARD_DISPLAY_LIMIT, xpLevelFromTotal } from '../types/index.js';
import { readLifetimeMoedas, readMoedaBalance } from '../services/economy.js';
import { syncMoedaBalancesForLeaderboard } from '../services/moeda-leaderboard.js';
import { processWeeklyLeaderboardRewardsIfDue } from '../services/weekly-leaderboard-rewards.js';
import { weeklyMetricValue } from '../services/weekly-stats.js';
import {
  LeaderboardPodiumHistory,
  type PodiumCounts,
} from '../repositories/leaderboard-podium-repository.js';
import type { MolduraId } from '../types/index.js';

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

type LeaderboardPeriod = 'semanal' | 'global';

function parsePeriod(raw: string | undefined): LeaderboardPeriod {
  return raw === 'global' ? 'global' : 'semanal';
}

/** Valor vitalício da métrica — XP total e Coins totais ganhas (sem descontar gasto). */
function globalMetricValue(
  user: EntryUser,
  metric: Exclude<LeaderboardMetric, 'streak'>,
): number {
  if (metric === 'xp') return user.gamificacao.nivel_xp;
  return readLifetimeMoedas(user);
}

function metricSort(metric: LeaderboardMetric, period: LeaderboardPeriod): Record<string, 1 | -1> {
  if (metric === 'streak') {
    // Semanal = sequência em andamento; Global = recorde (streak_maior) —
    // streak não tem acumulador que reseta toda semana, então "semanal" aqui
    // é só a sequência atual, sem relação com o ciclo semanal de recompensa.
    return period === 'global'
      ? { 'gamificacao.streak_maior': -1 }
      : { 'gamificacao.streak_atual': -1 };
  }
  if (metric === 'moedas') {
    return { 'cosmeticos.moedas': -1 };
  }
  return { 'gamificacao.nivel_xp': -1 };
}

/** Sequência exibida conforme o período: atual (semanal) ou recorde (global). */
function streakMetricValue(
  user: { gamificacao: { streak_atual: number; streak_maior: number } },
  period: LeaderboardPeriod,
): number {
  return period === 'global' ? user.gamificacao.streak_maior : user.gamificacao.streak_atual;
}

type EntryUser = {
  id: string;
  nome: string;
  avatar_url?: string | null;
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
    // A moldura especial mostra a contagem de itens secretos — não vem do pódio;
    // no ranking exibimos só o contador de pódio (especial fica sem número).
    moldura_count: moldura && moldura !== 'especial' ? molduraCountFor(podium, moldura) : null,
    is_me: isMe,
  };
}

// `find`/`countDocuments` só reconhecem comparação estrita (`is_guest === false`);
// `{ $ne: true }` não batia com nenhum dos dois e nunca filtrou nada de fato — os
// 21 convidados onboarded do banco vinham entrando na semanal de XP/Dorias.
const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: false,
};

/** Admins ficam fora dos rankings por padrão; o toggle na página de Ranking
    (`preferencias.admin_visivel_ranking`) reativa. Moderadores aparecem normal. */
function isHiddenAdmin(user: {
  role?: string | null;
  preferencias?: { admin_visivel_ranking?: boolean } | null;
}): boolean {
  return user.role === 'admin' && user.preferencias?.admin_visivel_ranking !== true;
}

leaderboardRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const metric = parseMetric(req.query.metric as string | undefined);
    const period = parsePeriod(req.query.period as string | undefined);
    const limit = Math.min(
      Number(req.query.limit) || LEADERBOARD_DISPLAY_LIMIT,
      LEADERBOARD_DISPLAY_LIMIT,
    );

    if (metric === 'moedas') {
      await syncMoedaBalancesForLeaderboard();
    }
    await processWeeklyLeaderboardRewardsIfDue();

    if (metric === 'streak') {
      // Busca com folga porque admins ocultos são removidos depois da query.
      const fetched = await User.find(leaderboardFilter, {
        sort: metricSort(metric, period),
        limit: limit + 10,
        skipAfk: true,
      });
      const users = fetched.filter((u) => !isHiddenAdmin(u)).slice(0, limit);
      const podiums = await LeaderboardPodiumHistory.countsForUsers(
        users.filter((u) => u.cosmeticos?.moldura_equipada).map((u) => u.id),
      );
      res.json(
        users.map((user, index) =>
          toEntry(
            user,
            index + 1,
            user.id === req.userId,
            streakMetricValue(user, period),
            podiums.get(user.id),
          ),
        ),
      );
      return;
    }

    if (period === 'global') {
      // Global usa totais vitalícios, que já são colunas simples (nivel_xp /
      // moedas_total_ganhas) — mesma estratégia do streak: sort+limit no
      // banco, sem puxar a tabela inteira pra ordenar em JS. Diferente da
      // semanal, que precisa da atividade sintética dos NPCs demo (calculada
      // em JS a partir de um hash, sem coluna equivalente pra ordenar no banco).
      const sortField: Record<string, 1 | -1> =
        metric === 'xp'
          ? { 'gamificacao.nivel_xp': -1 }
          : { 'cosmeticos.moedas_total_ganhas': -1 };
      const fetched = await User.find(leaderboardFilter, {
        sort: sortField,
        limit: limit + 10,
        skipAfk: true,
      });
      const users = fetched.filter((u) => !isHiddenAdmin(u)).slice(0, limit);
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
      return;
    }

    // Semanal ordena pelos acumuladores da semana — precisa da atividade
    // sintética dos NPCs demo (hash em JS, sem coluna equivalente no banco),
    // então continua puxando a tabela inteira pra ordenar em JS.
    const all = (await User.find(leaderboardFilter, { skipAfk: true })).filter(
      (u) => !isHiddenAdmin(u),
    );
    const ranked = all
      .map((user) => ({ user, value: weeklyMetricValue(user, metric) }))
      .sort((a, b) => b.value - a.value || a.user.nome.localeCompare(b.user.nome, 'pt-BR'))
      .slice(0, limit);

    const podiums = await LeaderboardPodiumHistory.countsForUsers(
      ranked.filter(({ user }) => user.cosmeticos?.moldura_equipada).map(({ user }) => user.id),
    );

    res.json(
      ranked.map(({ user, value }, index) =>
        toEntry(user, index + 1, user.id === req.userId, value, podiums.get(user.id)),
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
    const period = parsePeriod(req.query.period as string | undefined);

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

    if (metric === 'streak') {
      const [rank, total] = await Promise.all([
        User.countLeaderboardRank(user, metric, period),
        User.countDocuments(leaderboardFilter),
      ]);
      res.json({
        ...toEntry(user, rank, true, streakMetricValue(user, period), myPodium),
        total,
      });
      return;
    }

    const all = (await User.find(leaderboardFilter, { skipAfk: true })).filter(
      (u) => !isHiddenAdmin(u),
    );
    const valueOf = (target: (typeof all)[number]) =>
      period === 'global' ? globalMetricValue(target, metric) : weeklyMetricValue(target, metric);
    const myValue = valueOf(user);
    const rank =
      all.filter((other) => {
        if (other.id === user.id) return false;
        const otherValue = valueOf(other);
        return (
          otherValue > myValue ||
          (otherValue === myValue && other.nome.localeCompare(user.nome, 'pt-BR') < 0)
        );
      }).length + 1;

    res.json({ ...toEntry(user, rank, true, myValue, myPodium), total: all.length });
  } catch (error) {
    console.error('GET /api/leaderboard/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar posição.' });
  }
});
