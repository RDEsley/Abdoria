import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { authRouter } from './routes/auth.js';
import { cosmeticsRouter } from './routes/cosmetics.js';
import { shopRouter } from './routes/shop.js';
import { exercisesRouter } from './routes/exercises.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { presetsRouter } from './routes/presets.js';
import { usersRouter } from './routes/users.js';
import { workoutsRouter } from './routes/workouts.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/cosmetics', cosmeticsRouter);
  app.use('/api/shop', shopRouter);
  app.use('/api/exercises', exercisesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/workouts', workoutsRouter);
  app.use('/api/presets', presetsRouter);
  app.use('/api/leaderboard', leaderboardRouter);

  return app;
}
