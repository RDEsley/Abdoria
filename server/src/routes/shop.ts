import { Router } from 'express';
import { sanitizeUser } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  acknowledgeCosmeticUnlocks,
  buildShopResponse,
  equipShopItem,
  loadUserForShop,
  purchaseShopItem,
  redeemGiftCode,
} from '../services/shop.js';
import type { CosmeticKind } from '../types/index.js';

export const shopRouter = Router();

shopRouter.use(requireAuth);

function mapShopResponse(shop: ReturnType<typeof buildShopResponse>) {
  return {
    ...shop,
    moedas: shop.abdoria,
    moedas_por_nivel: shop.abdoria_por_xp,
  };
}

shopRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await loadUserForShop(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(mapShopResponse(buildShopResponse(user)));
  } catch (error) {
    console.error('GET /api/shop error:', error);
    res.status(500).json({ error: 'Erro ao carregar loja.' });
  }
});

shopRouter.post('/purchase', async (req: AuthRequest, res) => {
  try {
    const itemId = String(req.body?.id ?? '');
    if (!itemId) {
      res.status(400).json({ error: 'Informe o id do item.' });
      return;
    }

    const result = await purchaseShopItem(req.userId!, itemId);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({
      user: sanitizeUser(result.user),
      item: result.item,
      abdoria_gasta: result.abdoria_gasta,
      moedas_gastas: result.abdoria_gasta,
    });
  } catch (error) {
    console.error('POST /api/shop/purchase error:', error);
    res.status(500).json({ error: 'Erro ao comprar item.' });
  }
});

shopRouter.patch('/equip', async (req: AuthRequest, res) => {
  try {
    const kind = req.body?.kind as CosmeticKind;
    const itemId = String(req.body?.id ?? '');

    if (!kind || !itemId) {
      res.status(400).json({ error: 'Informe tipo e id do item.' });
      return;
    }

    const result = await equipShopItem(req.userId!, kind, itemId);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({ user: sanitizeUser(result.user), item: result.item });
  } catch (error) {
    console.error('PATCH /api/shop/equip error:', error);
    res.status(500).json({ error: 'Erro ao equipar item.' });
  }
});

shopRouter.post('/celebracao/ack', async (req: AuthRequest, res) => {
  try {
    const result = await acknowledgeCosmeticUnlocks(req.userId!);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }
    res.json({ user: sanitizeUser(result.user) });
  } catch (error) {
    console.error('POST /api/shop/celebracao/ack error:', error);
    res.status(500).json({ error: 'Erro ao confirmar celebração.' });
  }
});

shopRouter.post('/redeem-code', async (req: AuthRequest, res) => {
  try {
    const rawCode = String(req.body?.code ?? '');
    if (!rawCode.trim()) {
      res.status(400).json({ error: 'Informe o código presente.' });
      return;
    }

    const result = await redeemGiftCode(req.userId!, rawCode);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    res.json({
      user: sanitizeUser(result.user),
      codigo: result.codigo,
      xp_ganho: result.xp_ganho,
      abdoria_ganha: result.abdoria_ganha,
      itens_desbloqueados: result.itens_desbloqueados,
      titulo: result.titulo,
      mensagem: result.mensagem,
      recompensas: result.recompensas,
      // `redeemGiftCode` calcula isso comparando o nível antes/depois; sem
      // repassar aqui, o cliente nunca recebia e a celebração de level up
      // não acontecia ao resgatar um código (inclusive o `levelup`, cujo
      // propósito é justamente subir de nível).
      level_up: result.level_up ?? null,
    });
  } catch (error) {
    console.error('POST /api/shop/redeem-code error:', error);
    res.status(500).json({ error: 'Erro ao resgatar código.' });
  }
});
