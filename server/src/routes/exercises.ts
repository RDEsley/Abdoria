import { Router } from 'express';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { findExercisesForUser } from '../services/exercise-catalog.js';
import { findSimilarExercisesForUser } from '../services/similar-exercises.js';
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

exercisesRouter.get('/similar', requireAuth, async (req: AuthRequest, res) => {
  try {
    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    if (!slug) {
      res.status(400).json({ error: 'Informe o slug do exercício (query slug).' });
      return;
    }

    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const queueRaw = req.query.queueSlugs;
    const queueSlugs =
      typeof queueRaw === 'string'
        ? queueRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(queueRaw)
          ? queueRaw.flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean)
          : [];

    const result = await findSimilarExercisesForUser(user, slug, { queueSlugs });
    if (!result.reference) {
      res.status(404).json({ error: 'Exercício não encontrado.' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('GET /api/exercises/similar error:', error);
    res.status(500).json({ error: 'Erro ao buscar exercícios similares.' });
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
