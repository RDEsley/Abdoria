import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { listQuestsForUser, claimQuest } from '../services/quests.js';
import { buildQuestContext } from '../services/day.js';

export const questsRouter = Router();
questsRouter.use(requireAuth);

questsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const ctx = await buildQuestContext(req.userId!);
    const quests = await listQuestsForUser(req.userId!, ctx);
    res.json(quests);
  } catch (error) {
    console.error('GET /api/quests error:', error);
    res.status(500).json({ error: 'Erro ao listar missões.' });
  }
});

questsRouter.post('/:id/claim', async (req: AuthRequest, res) => {
  try {
    const ctx = await buildQuestContext(req.userId!);
    const result = await claimQuest(req.userId!, String(req.params.id), ctx);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao coletar missão.';
    const statusCode =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: number }).status)
        : undefined;
    const status =
      statusCode === 404
        ? 404
        : message.includes('já coletada') || message.includes('não concluída')
          ? 400
          : message.includes('não encontrada')
            ? 404
            : 500;
    res.status(status).json({ error: message });
  }
});
