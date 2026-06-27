import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/auth.js';
import { findExercisesForUser } from '../services/exercise-catalog.js';
import type { MusculoPrincipal, Prioridade } from '../types/index.js';

export const exercisesRouter = Router();

exercisesRouter.use(optionalAuth);

exercisesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { musculo, nivel, prioridade } = req.query;

    const filter: {
      musculo?: MusculoPrincipal;
      nivel?: number;
      prioridade?: Prioridade;
    } = {};

    if (typeof musculo === 'string' && musculo.length > 0) {
      filter.musculo = musculo as MusculoPrincipal;
    }

    if (typeof nivel === 'string' && nivel.length > 0) {
      const parsed = Number(nivel);
      if (!Number.isNaN(parsed)) {
        filter.nivel = parsed;
      }
    }

    if (typeof prioridade === 'string' && prioridade.length > 0) {
      filter.prioridade = prioridade as Prioridade;
    }

    let preferencias = null;
    if (req.userId) {
      const user = await User.findById(req.userId);
      preferencias = user?.preferencias ?? null;
    }

    const exercises = await findExercisesForUser(preferencias, filter);
    res.json(exercises);
  } catch (error) {
    console.error('GET /api/exercises error:', error);
    res.status(500).json({ error: 'Erro ao listar exercícios.' });
  }
});

exercisesRouter.get('/:slug', async (req: AuthRequest, res) => {
  try {
    let preferencias = null;
    if (req.userId) {
      const user = await User.findById(req.userId);
      preferencias = user?.preferencias ?? null;
    }

    const exercises = await findExercisesForUser(preferencias);
    const exercise = exercises.find((e) => e.slug === req.params.slug);

    if (!exercise) {
      res.status(404).json({ error: 'Exercício não encontrado.' });
      return;
    }

    res.json(exercise);
  } catch (error) {
    console.error('GET /api/exercises/:slug error:', error);
    res.status(500).json({ error: 'Erro ao buscar exercício.' });
  }
});
