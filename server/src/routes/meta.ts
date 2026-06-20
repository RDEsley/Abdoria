import { Router } from 'express';
import { User, sanitizeUser } from '../models/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { awardAbdoriaFromXp } from '../services/economy.js';
import { claimAfkRewards, hasAfkRewardsToClaim, syncAfkRewards, touchAfkPresence } from '../services/afk.js';
import { readInventarioSummary, useEnergyDrink } from '../services/inventory.js';

export const metaRouter = Router();

metaRouter.use(requireAuth);

metaRouter.get('/afk', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    syncAfkRewards(user);
    await user.save();
    const afk = user.afk;
    res.json({
      minutos_acumulados: afk.minutos_acumulados ?? 0,
      pending: afk.pending,
      has_rewards: hasAfkRewardsToClaim(user.afk as Parameters<typeof hasAfkRewardsToClaim>[0]),
      arma_preferida: user.preferencias?.arma_preferida ?? 'arco',
    });
  } catch (error) {
    console.error('GET /api/meta/afk error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar patrulha AFK.' });
  }
});

metaRouter.post('/afk/claim', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    syncAfkRewards(user);
    if (!hasAfkRewardsToClaim(user.afk as Parameters<typeof hasAfkRewardsToClaim>[0])) {
      res.status(400).json({ error: 'Nenhuma recompensa AFK para coletar.' });
      return;
    }
    const claimed = claimAfkRewards(user);
    awardAbdoriaFromXp(user);
    await user.save();
    res.json({ user: sanitizeUser(user), claimed });
  } catch (error) {
    console.error('POST /api/meta/afk/claim error:', error);
    res.status(500).json({ error: 'Erro ao coletar recompensas AFK.' });
  }
});

metaRouter.post('/afk/ping', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    touchAfkPresence(user);
    await user.save();
    const afk = user.afk;
    res.json({
      ok: true,
      minutos_acumulados: afk.minutos_acumulados ?? 0,
      pending: afk.pending,
      has_rewards: hasAfkRewardsToClaim(user.afk as Parameters<typeof hasAfkRewardsToClaim>[0]),
    });
  } catch (error) {
    console.error('POST /api/meta/afk/ping error:', error);
    res.status(500).json({ error: 'Erro ao registrar presença.' });
  }
});

metaRouter.get('/inventory', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(readInventarioSummary(user));
  } catch (error) {
    console.error('GET /api/meta/inventory error:', error);
    res.status(500).json({ error: 'Erro ao buscar inventário.' });
  }
});

metaRouter.post('/inventory/energy-drink', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const quantity = Math.max(1, Math.min(10, Number(req.body?.quantity) || 1));
    const result = useEnergyDrink(user, quantity);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save();
    res.json({
      user: sanitizeUser(user),
      bonus_added: result.bonus_added,
      inventario: readInventarioSummary(user),
    });
  } catch (error) {
    console.error('POST /api/meta/inventory/energy-drink error:', error);
    res.status(500).json({ error: 'Erro ao usar Energy Drink.' });
  }
});

metaRouter.patch('/preferences', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (req.body?.ocultar_aviso_xp_diario !== undefined) {
      user.preferencias.ocultar_aviso_xp_diario = Boolean(req.body.ocultar_aviso_xp_diario);
    }
    if (req.body?.arma_preferida === 'arco' || req.body?.arma_preferida === 'espada') {
      user.preferencias.arma_preferida = req.body.arma_preferida;
    }
    await user.save();
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('PATCH /api/meta/preferences error:', error);
    res.status(500).json({ error: 'Erro ao salvar preferências.' });
  }
});
