import { Router, type Response } from 'express';
import { dispatchDuePersonalReminders } from '../services/reminder-push.js';

export const cronRouter = Router();

function authorizeCron(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  return header.slice('Bearer '.length) === secret;
}

function handleReminderPush(
  req: { headers: Record<string, string | string[] | undefined> },
  res: Response,
): void {
  if (!authorizeCron(req)) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  void dispatchDuePersonalReminders()
    .then((result) => res.json({ ok: true, ...result }))
    .catch((error) => {
      console.error('cron/reminder-push error:', error);
      res.status(500).json({ error: 'Falha ao despachar lembretes push.' });
    });
}

cronRouter.get('/reminder-push', (req, res) => handleReminderPush(req, res));
cronRouter.post('/reminder-push', (req, res) => handleReminderPush(req, res));
