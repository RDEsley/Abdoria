import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { readInventarioSummary } from '../services/inventory.js';

export const metaRouter = Router();

metaRouter.use(requireAuth);

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
    res.status(500).json({ error: 'Erro ao carregar inventário.' });
  }
});
