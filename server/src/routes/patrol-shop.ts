import { Router } from 'express';
import { sanitizeUser } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  buildPatrolShopResponse,
  equipPatrolWeapon,
  loadUserForPatrolShop,
  purchasePatrolWeapon,
  sellPatrolMaterial,
  sellPatrolMaterialsByTier,
} from '../services/patrol-shop.js';
import type { PatrolWeaponKind } from '../types/index.js';

export const patrolShopRouter = Router();

patrolShopRouter.use(requireAuth);

patrolShopRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await loadUserForPatrolShop(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(buildPatrolShopResponse(user));
  } catch (error) {
    console.error('GET /api/patrol-shop error:', error);
    res.status(500).json({ error: 'Erro ao carregar a Loja da Vila.' });
  }
});

patrolShopRouter.post('/purchase', async (req: AuthRequest, res) => {
  try {
    const itemId = String(req.body?.id ?? '');
    if (!itemId) {
      res.status(400).json({ error: 'Informe o id do item.' });
      return;
    }

    const result = await purchasePatrolWeapon(req.userId!, itemId);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({
      user: sanitizeUser(result.user),
      item: result.item,
      abdoria_gasta: result.abdoria_gasta,
    });
  } catch (error) {
    console.error('POST /api/patrol-shop/purchase error:', error);
    res.status(500).json({ error: 'Erro ao comprar item.' });
  }
});

patrolShopRouter.patch('/equip', async (req: AuthRequest, res) => {
  try {
    const kind = req.body?.kind as PatrolWeaponKind;
    const itemId = String(req.body?.id ?? '');
    if (!kind || !itemId) {
      res.status(400).json({ error: 'Informe tipo e id do item.' });
      return;
    }

    const result = await equipPatrolWeapon(req.userId!, kind, itemId);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({ user: sanitizeUser(result.user), item: result.item });
  } catch (error) {
    console.error('PATCH /api/patrol-shop/equip error:', error);
    res.status(500).json({ error: 'Erro ao equipar item.' });
  }
});

patrolShopRouter.post('/materials/sell', async (req: AuthRequest, res) => {
  try {
    const itemId = String(req.body?.id ?? '');
    const quantity = req.body?.quantity === 'all' ? 'all' : Number(req.body?.quantity ?? 1);
    if (!itemId) {
      res.status(400).json({ error: 'Informe o material que deseja vender.' });
      return;
    }

    const result = await sellPatrolMaterial(req.userId!, itemId, quantity);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({
      user: sanitizeUser(result.user),
      quantity_sold: result.quantity_sold,
      coins_gained: result.coins_gained,
      shop: result.shop,
    });
  } catch (error) {
    console.error('POST /api/patrol-shop/materials/sell error:', error);
    res.status(500).json({ error: 'Erro ao vender material.' });
  }
});

patrolShopRouter.post('/materials/sell-bulk', async (req: AuthRequest, res) => {
  try {
    const requestedTier = String(req.body?.tier ?? 'all');
    if (!['all', 'common', 'elite', 'boss'].includes(requestedTier)) {
      res.status(400).json({ error: 'Selecione uma raridade válida.' });
      return;
    }
    const result = await sellPatrolMaterialsByTier(
      req.userId!,
      requestedTier as 'all' | 'common' | 'elite' | 'boss',
    );
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }
    res.json({
      user: sanitizeUser(result.user),
      quantity_sold: result.quantity_sold,
      coins_gained: result.coins_gained,
      shop: result.shop,
    });
  } catch (error) {
    console.error('POST /api/patrol-shop/materials/sell-bulk error:', error);
    res.status(500).json({ error: 'Erro ao vender materiais em lote.' });
  }
});
