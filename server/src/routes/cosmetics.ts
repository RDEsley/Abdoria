import { Router } from 'express';
import { sanitizeUser } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  buildCosmeticsResponse,
  equipCosmetic,
  loadUserForCosmetics,
  purchaseCosmetic,
} from '../services/shop.js';
import type { CosmeticKind } from '../types/index.js';

export const cosmeticsRouter = Router();

cosmeticsRouter.use(requireAuth);

cosmeticsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await loadUserForCosmetics(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(buildCosmeticsResponse(user));
  } catch (error) {
    console.error('GET /api/cosmetics error:', error);
    res.status(500).json({ error: 'Erro ao carregar customização.' });
  }
});

cosmeticsRouter.post('/purchase', async (req: AuthRequest, res) => {
  try {
    const cosmeticId = String(req.body?.id ?? '');
    if (!cosmeticId) {
      res.status(400).json({ error: 'Informe o id do item.' });
      return;
    }

    const result = await purchaseCosmetic(req.userId!, cosmeticId);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({
      user: sanitizeUser(result.user),
      item: result.item,
      moedas_gastas: result.abdoria_gasta,
    });
  } catch (error) {
    console.error('POST /api/cosmetics/purchase error:', error);
    res.status(500).json({ error: 'Erro ao comprar item.' });
  }
});

cosmeticsRouter.patch('/equip', async (req: AuthRequest, res) => {
  try {
    const kind = req.body?.kind as CosmeticKind;
    const cosmeticId = String(req.body?.id ?? '');

    if (kind !== 'avatar' && kind !== 'borda') {
      res.status(400).json({ error: 'Tipo de item inválido.' });
      return;
    }
    if (!cosmeticId) {
      res.status(400).json({ error: 'Informe o id do item.' });
      return;
    }

    const result = await equipCosmetic(req.userId!, kind, cosmeticId);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({
      user: sanitizeUser(result.user),
      item: result.item,
    });
  } catch (error) {
    console.error('PATCH /api/cosmetics/equip error:', error);
    res.status(500).json({ error: 'Erro ao equipar item.' });
  }
});
