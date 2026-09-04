import cors from 'cors';
import express from 'express';
import { connectDB, probeDatabase } from './db.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { cosmeticsRouter } from './routes/cosmetics.js';
import { shopRouter } from './routes/shop.js';
import { exercisesRouter } from './routes/exercises.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { notificationsRouter } from './routes/notifications.js';
import { pushRouter } from './routes/push.js';
import { cronRouter } from './routes/cron.js';
import { socialRouter } from './routes/social.js';
import { presetsRouter } from './routes/presets.js';
import { usersRouter } from './routes/users.js';
import { workoutsRouter } from './routes/workouts.js';
import { activitiesRouter, activityLogsRouter, routinesRouter } from './routes/activities.js';
import { dayRouter, insightsRouter } from './routes/day.js';
import { questsRouter } from './routes/quests.js';
import { nutritionRouter } from './routes/nutrition.js';

export function createApp() {
  const app = express();

  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    'https://evolyn-core-quest.vercel.app',
    'http://localhost:5173',
    'http://localhost',
    'capacitor://localhost',
    ...configuredOrigins,
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        const isProjectPreview = /^https:\/\/evolyn-core-quest(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
          origin,
        );
        callback(null, allowedOrigins.has(origin) || isProjectPreview);
      },
    }),
  );
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    const probe = await probeDatabase();
    if (probe.status === 'disconnected') {
      console.error('Health check: Supabase probe failed:', probe.error);
    }
    res.json({
      status: 'ok',
      database: probe.status,
      timestamp: new Date().toISOString(),
    });
  });

  app.use(async (_req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error('Supabase connection error:', error);
      res.status(503).json({ error: 'Banco de dados indisponível.' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/cosmetics', cosmeticsRouter);
  app.use('/api/shop', shopRouter);
  app.use('/api/exercises', exercisesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/workouts', workoutsRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/activity-logs', activityLogsRouter);
  app.use('/api/routines', routinesRouter);
  app.use('/api/day', dayRouter);
  app.use('/api/insights', insightsRouter);
  app.use('/api/presets', presetsRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/push', pushRouter);
  app.use('/api/cron', cronRouter);
  app.use('/api/quests', questsRouter);
  app.use('/api/nutrition', nutritionRouter);
  app.use('/api/social', socialRouter);
  app.use('/api/admin', adminRouter);

  return app;
}
