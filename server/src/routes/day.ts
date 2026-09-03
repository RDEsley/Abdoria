import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDaySnapshot, getInsightsForUser } from '../services/day.js';

export const dayRouter = Router();
dayRouter.use(requireAuth);

dayRouter.get('/', async (req: AuthRequest, res) => {
  try {
    res.json(await getDaySnapshot(req.userId!));
  } catch (error) {
    console.error('GET /api/day error:', error);
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: number }).status) || 500
        : 500;
    res.status(status).json({
      error: error instanceof Error ? error.message : 'Erro ao carregar o dia.',
    });
  }
});

export const insightsRouter = Router();
insightsRouter.use(requireAuth);

insightsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    res.json(await getInsightsForUser(req.userId!));
  } catch (error) {
    console.error('GET /api/insights error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao carregar insights.',
    });
  }
});
