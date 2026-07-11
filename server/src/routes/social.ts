import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { xpLevelFromTotal } from '../types/index.js';
import { Follows } from '../repositories/follow-repository.js';
import { Notifications } from '../repositories/notification-repository.js';

export const socialRouter = Router();

socialRouter.use(requireAuth);

const suggestionFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

const SUGGESTION_LIMIT = 10;

/** Sugestões de perfis: usuários reais primeiro, NPCs demo completam a lista. */
socialRouter.get('/suggestions', async (req: AuthRequest, res) => {
  try {
    const [all, followingIds] = await Promise.all([
      User.find(suggestionFilter),
      Follows.followingIds(req.userId!),
    ]);
    const following = new Set(followingIds);

    const candidates = all
      .filter((user) => user.id !== req.userId && !following.has(user.id))
      .sort((a, b) => {
        // Reais antes de NPCs; dentro de cada grupo, mais XP primeiro.
        if (a.is_demo_npc !== b.is_demo_npc) return a.is_demo_npc ? 1 : -1;
        return b.gamificacao.nivel_xp - a.gamificacao.nivel_xp;
      })
      .slice(0, SUGGESTION_LIMIT)
      .map((user) => ({
        user_id: user.id,
        nome: user.nome,
        avatar_url: user.avatar_url ?? null,
        moldura_equipada: user.cosmeticos?.moldura_equipada ?? null,
        level: xpLevelFromTotal(user.gamificacao.nivel_xp),
      }));

    res.json({ items: candidates, following_count: following.size });
  } catch (error) {
    console.error('GET /api/social/suggestions error:', error);
    res.status(500).json({ error: 'Erro ao buscar sugestões.' });
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
      const me = await User.findById(req.userId!, { lean: true });
      await Notifications.createMany([
        {
          user_id: targetId,
          tipo: 'novo_seguidor',
          titulo: `${me?.nome ?? 'Alguém'} começou a seguir você`,
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

socialRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const [counts, followingIds] = await Promise.all([
      Follows.counts(req.userId!),
      Follows.followingIds(req.userId!),
    ]);
    res.json({ ...counts, following_ids: followingIds });
  } catch (error) {
    console.error('GET /api/social/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados sociais.' });
  }
});
