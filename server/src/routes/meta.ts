import { Router } from 'express';
import { User, sanitizeUser } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { awardAbdoriaFromXp } from '../services/economy.js';
import { claimAfkRewards, afkResponsePayload, hasAfkRewardsToClaim, syncAfkRewards, touchAfkPresence } from '../services/afk.js';
import { readBestiaryResponse } from '../services/bestiario.js';
import { readInventarioSummary, useEnergyDrink, usePatrolCache, useRouteDrinkInExploration } from '../services/inventory.js';
import { getItemCount } from '../services/inventory.js';
import { CURRENCY_NAME, ROUTE_DRINK_ITEM_ID } from '../types/index.js';

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
    res.json(afkResponsePayload(user, {
      arma_preferida: user.preferencias?.arma_preferida ?? 'arco',
      route_drink_count: getItemCount(user, ROUTE_DRINK_ITEM_ID),
    }));
  } catch (error) {
    console.error('GET /api/meta/afk error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar Exploração AFK.' });
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
    if (!hasAfkRewardsToClaim(user.afk)) {
      res.status(400).json({ error: 'Nenhuma recompensa AFK para coletar.' });
      return;
    }
    const { claimed, overflow_to_dorias } = claimAfkRewards(user);
    awardAbdoriaFromXp(user);
    await user.save();
    res.json({ user: sanitizeUser(user), claimed, overflow_to_dorias });
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
    res.json({ ok: true, ...afkResponsePayload(user) });
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

metaRouter.post('/inventory/bau-patrulha', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const result = usePatrolCache(user);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    awardAbdoriaFromXp(user);
    await user.save();
    res.json({
      user: sanitizeUser(user),
      claimed: result.claimed,
      inventario: readInventarioSummary(user),
    });
  } catch (error) {
    console.error('POST /api/meta/inventory/bau-patrulha error:', error);
    res.status(500).json({ error: 'Erro ao usar Baú da Exploração.' });
  }
});

metaRouter.post('/inventory/route-drink', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    syncAfkRewards(user);
    const result = useRouteDrinkInExploration(user);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save();
    res.json({
      user: sanitizeUser(user),
      hours: result.hours,
      inventario: readInventarioSummary(user),
      ...afkResponsePayload(user, {
        arma_preferida: user.preferencias?.arma_preferida ?? 'arco',
        route_drink_count: getItemCount(user, ROUTE_DRINK_ITEM_ID),
      }),
    });
  } catch (error) {
    console.error('POST /api/meta/inventory/route-drink error:', error);
    res.status(500).json({ error: 'Erro ao usar Route Drink.' });
  }
});

metaRouter.get('/bestiary', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(readBestiaryResponse(user));
  } catch (error) {
    console.error('GET /api/meta/bestiary error:', error);
    res.status(500).json({ error: 'Erro ao carregar bestiário.' });
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
