import { Router } from 'express';
import { Exercise } from '../models/Exercise.js';
import type { MusculoPrincipal, Prioridade } from '../types/index.js';

export const exercisesRouter = Router();

exercisesRouter.get('/', async (req, res) => {
  try {
    const filter: Record<string, unknown> = { ativo: true };

    const { musculo, nivel, prioridade } = req.query;

    if (typeof musculo === 'string' && musculo.length > 0) {
      filter.musculo_principal = musculo as MusculoPrincipal;
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

    const exercises = await Exercise.find(filter, { sort: { prioridade: 1, nome: 1 } });
    res.json(exercises);
  } catch (error) {
    console.error('GET /api/exercises error:', error);
    res.status(500).json({ error: 'Erro ao listar exercícios.' });
  }
});

exercisesRouter.get('/:slug', async (req, res) => {
  try {
    const exercise = await Exercise.findOne({ slug: req.params.slug, ativo: true });

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
