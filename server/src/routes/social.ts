import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { xpLevelFromTotal, type MolduraId } from '../types/index.js';
import type { UserLean } from '../types/user-record.js';
import { Follows } from '../repositories/follow-repository.js';
import { ProfileLikes } from '../repositories/like-repository.js';
import { Notifications } from '../repositories/notification-repository.js';
import {
  LeaderboardPodiumHistory,
  type PodiumCounts,
} from '../repositories/leaderboard-podium-repository.js';

export const socialRouter = Router();

socialRouter.use(requireAuth);

function molduraCountFor(counts: PodiumCounts | undefined, moldura: MolduraId | null): number | null {
  if (!counts || !moldura || moldura === 'especial') return null;
  if (moldura === 'ouro') return counts.first;
  if (moldura === 'prata') return counts.second;
  return counts.third;
}

interface Relation {
  followingIds: Set<string>;
  followerIds: Set<string>;
}

async function loadRelation(userId: string): Promise<Relation> {
  const [followingIds, followerIds] = await Promise.all([
    Follows.followingIds(userId),
    Follows.followerIds(userId),
  ]);
  return { followingIds: new Set(followingIds), followerIds: new Set(followerIds) };
}

function toSocialEntry(
  user: UserLean,
  meId: string,
  relation: Relation,
  podium?: PodiumCounts,
) {
  const moldura = user.cosmeticos?.moldura_equipada ?? null;
  const seguindo = relation.followingIds.has(user.id);
  const segueVoce = relation.followerIds.has(user.id);
  return {
    user_id: user.id,
    nome: user.nome,
    avatar_url: user.avatar_url ?? null,
    moldura_equipada: moldura,
    moldura_count: molduraCountFor(podium, moldura),
    level: xpLevelFromTotal(user.gamificacao.nivel_xp),
    streak_atual: user.gamificacao.streak_atual,
    is_me: user.id === meId,
    seguindo,
    segue_voce: segueVoce,
    amigo: seguindo && segueVoce,
  };
}

async function loadUsersByIds(ids: Set<string>): Promise<UserLean[]> {
  if (ids.size === 0) return [];
  const all = await User.find({ onboarding_completed: true });
  return all.filter((user) => ids.has(user.id));
}

async function podiumsFor(users: UserLean[]) {
  return LeaderboardPodiumHistory.countsForUsers(
    users.filter((u) => u.cosmeticos?.moldura_equipada).map((u) => u.id),
  );
}

/** Ranking entre amigos: quem se segue mutuamente + você, ordenado por XP total. */
socialRouter.get('/friends', async (req: AuthRequest, res) => {
  try {
    const relation = await loadRelation(req.userId!);
    const friendIds = new Set(
      [...relation.followingIds].filter((id) => relation.followerIds.has(id)),
    );
    friendIds.add(req.userId!);

    const users = await loadUsersByIds(friendIds);
    const podiums = await podiumsFor(users);

    const items = users
      .sort((a, b) => b.gamificacao.nivel_xp - a.gamificacao.nivel_xp)
      .map((user) => toSocialEntry(user, req.userId!, relation, podiums.get(user.id)));

    res.json({ items });
  } catch (error) {
    console.error('GET /api/social/friends error:', error);
    res.status(500).json({ error: 'Erro ao buscar amigos.' });
  }
});

/** Quem você segue (aba Seguindo). */
socialRouter.get('/following', async (req: AuthRequest, res) => {
  try {
    const relation = await loadRelation(req.userId!);
    const users = await loadUsersByIds(relation.followingIds);
    const podiums = await podiumsFor(users);

    const items = users
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((user) => toSocialEntry(user, req.userId!, relation, podiums.get(user.id)));

    res.json({ items });
  } catch (error) {
    console.error('GET /api/social/following error:', error);
    res.status(500).json({ error: 'Erro ao buscar quem você segue.' });
  }
});

/** Quem segue você (aba Seguidores) — seguir de volta vira amizade. */
socialRouter.get('/followers', async (req: AuthRequest, res) => {
  try {
    const relation = await loadRelation(req.userId!);
    const users = await loadUsersByIds(relation.followerIds);
    const podiums = await podiumsFor(users);

    const items = users
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((user) => toSocialEntry(user, req.userId!, relation, podiums.get(user.id)));

    res.json({ items });
  } catch (error) {
    console.error('GET /api/social/followers error:', error);
    res.status(500).json({ error: 'Erro ao buscar seguidores.' });
  }
});

/** Busca de perfis por nome — para adicionar amigos. */
socialRouter.get('/search', async (req: AuthRequest, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      res.json({ items: [] });
      return;
    }

    const [users, relation] = await Promise.all([
      User.searchByName(q, req.userId!),
      loadRelation(req.userId!),
    ]);
    const podiums = await podiumsFor(users);

    res.json({
      items: users.map((user) => toSocialEntry(user, req.userId!, relation, podiums.get(user.id))),
    });
  } catch (error) {
    console.error('GET /api/social/search error:', error);
    res.status(500).json({ error: 'Erro ao buscar perfis.' });
  }
});

socialRouter.post('/follow', async (req: AuthRequest, res) => {
  try {
    const targetId = typeof req.body?.user_id === 'string' ? req.body.user_id : '';
    if (!targetId || targetId === req.userId) {
      res.status(400).json({ error: 'Usuário inválido.' });
      return;
    }

    const target = await User.findById(targetId, { lean: true });
    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    await Follows.follow(req.userId!, targetId);

    if (!target.is_demo_npc) {
      const [me, targetFollowing] = await Promise.all([
        User.findById(req.userId!, { lean: true }),
        Follows.followingIds(targetId),
      ]);
      const viraramAmigos = targetFollowing.includes(req.userId!);
      await Notifications.createMany([
        {
          user_id: targetId,
          tipo: 'novo_seguidor',
          titulo: viraramAmigos
            ? `${me?.nome ?? 'Alguém'} seguiu você de volta — vocês agora são amigos!`
            : `${me?.nome ?? 'Alguém'} começou a seguir você`,
          payload: { follower_id: req.userId },
        },
      ]);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/social/follow error:', error);
    res.status(500).json({ error: 'Erro ao seguir usuário.' });
  }
});

socialRouter.delete('/follow/:id', async (req: AuthRequest, res) => {
  try {
    await Follows.unfollow(req.userId!, String(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/social/follow error:', error);
    res.status(500).json({ error: 'Erro ao deixar de seguir.' });
  }
});

/** Remove um seguidor (recusar) — ele deixa de seguir você. */
socialRouter.delete('/follower/:id', async (req: AuthRequest, res) => {
  try {
    await Follows.unfollow(String(req.params.id), req.userId!);
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/social/follower error:', error);
    res.status(500).json({ error: 'Erro ao remover seguidor.' });
  }
});

/** Curtir o perfil de outro usuário (coração). Unilateral e idempotente. */
socialRouter.post('/like', async (req: AuthRequest, res) => {
  try {
    const targetId = typeof req.body?.user_id === 'string' ? req.body.user_id : '';
    if (!targetId || targetId === req.userId) {
      res.status(400).json({ error: 'Usuário inválido.' });
      return;
    }
    const target = await User.findById(targetId, { lean: true });
    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    await ProfileLikes.like(req.userId!, targetId);
    const total = await ProfileLikes.countFor(targetId);
    res.json({ ok: true, total, eu_curti: true });
  } catch (error) {
    console.error('POST /api/social/like error:', error);
    res.status(500).json({ error: 'Erro ao curtir perfil.' });
  }
});

/** Descurtir. */
socialRouter.delete('/like/:id', async (req: AuthRequest, res) => {
  try {
    const targetId = String(req.params.id);
    await ProfileLikes.unlike(req.userId!, targetId);
    const total = await ProfileLikes.countFor(targetId);
    res.json({ ok: true, total, eu_curti: false });
  } catch (error) {
    console.error('DELETE /api/social/like error:', error);
    res.status(500).json({ error: 'Erro ao remover curtida.' });
  }
});

socialRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const relation = await loadRelation(req.userId!);
    const amigos = [...relation.followingIds].filter((id) => relation.followerIds.has(id)).length;
    const likes_recebidos = await ProfileLikes.countFor(req.userId!);
    res.json({
      followers: relation.followerIds.size,
      following: relation.followingIds.size,
      amigos,
      following_ids: [...relation.followingIds],
      likes_recebidos,
    });
  } catch (error) {
    console.error('GET /api/social/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados sociais.' });
  }
});
