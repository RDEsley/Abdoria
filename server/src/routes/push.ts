import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { PushSubscriptions } from '../repositories/push-subscription-repository.js';

export const pushRouter = Router();

pushRouter.use(requireAuth);

pushRouter.post('/subscribe', async (req: AuthRequest, res) => {
  try {
    const body = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
      time_zone?: string;
    };
    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();
    if (!endpoint || !p256dh || !auth) {
      res.status(400).json({ error: 'Assinatura Web Push inválida.' });
      return;
    }

    await PushSubscriptions.upsert(req.userId!, {
      endpoint,
      keys: { p256dh, auth },
      time_zone: body.time_zone,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/push/subscribe error:', error);
    res.status(500).json({ error: 'Não foi possível registrar a assinatura push.' });
  }
});

pushRouter.delete('/subscribe', async (req: AuthRequest, res) => {
  try {
    const endpoint = String(req.body?.endpoint ?? '').trim();
    if (endpoint) {
      await PushSubscriptions.deleteByEndpoint(req.userId!, endpoint);
    } else {
      await PushSubscriptions.deleteAllForUser(req.userId!);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/push/subscribe error:', error);
    res.status(500).json({ error: 'Não foi possível remover a assinatura push.' });
  }
});
