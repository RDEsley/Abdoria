import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { Notifications } from '../repositories/notification-repository.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const [items, unread] = await Promise.all([
      Notifications.listForUser(req.userId!),
      Notifications.unreadCount(req.userId!),
    ]);
    res.json({ items, unread_count: unread });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res) => {
  try {
    await Notifications.markAllRead(req.userId!);
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/notifications/read-all error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificações como lidas.' });
  }
});

/** Limpa todas as notificações do usuário. */
notificationsRouter.delete('/', async (req: AuthRequest, res) => {
  try {
    await Notifications.deleteAllForUser(req.userId!);
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/notifications error:', error);
    res.status(500).json({ error: 'Erro ao limpar notificações.' });
  }
});

/** Remove (dismiss) uma notificação específica. */
notificationsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await Notifications.deleteOne(req.userId!, String(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/notifications/:id error:', error);
    res.status(500).json({ error: 'Erro ao remover notificação.' });
  }
});
