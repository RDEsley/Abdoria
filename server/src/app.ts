import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import { authRouter } from './routes/auth.js';
import { cosmeticsRouter } from './routes/cosmetics.js';
import { shopRouter } from './routes/shop.js';
import { exercisesRouter } from './routes/exercises.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { metaRouter } from './routes/meta.js';
import { presetsRouter } from './routes/presets.js';
import { usersRouter } from './routes/users.js';
import { workoutsRouter } from './routes/workouts.js';

async function probeDatabase(): Promise<'connected' | 'disconnected'> {
  try {
    await Promise.race([
      connectDB(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 4_000);
      }),
    ]);
    return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  } catch {
    return 'disconnected';
  }
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    const database = await probeDatabase();
    res.json({
      status: 'ok',
      database,
      timestamp: new Date().toISOString(),
    });
  });

  app.use(async (_req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      res.status(503).json({ error: 'Banco de dados indisponível.' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/cosmetics', cosmeticsRouter);
  app.use('/api/shop', shopRouter);
  app.use('/api/exercises', exercisesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/workouts', workoutsRouter);
  app.use('/api/presets', presetsRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/meta', metaRouter);

  return app;
}
