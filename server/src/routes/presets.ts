import { Router } from 'express';
import { WorkoutPreset } from '../domain/WorkoutPreset.js';
import { User } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { recommendWorkout, getRecommendedPresetsList } from '../services/recommendation.js';

export const presetsRouter = Router();

presetsRouter.use(requireAuth);

presetsRouter.get('/', async (_req, res) => {
  try {
    const presets = await WorkoutPreset.find({ sort: { ciclo_id: 1, nivel: 1 } });
    res.json(presets);
  } catch (error) {
    console.error('GET /api/presets error:', error);
    res.status(500).json({ error: 'Erro ao buscar presets.' });
  }
});

presetsRouter.get('/recommend', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const allowRepeats = req.query.allowRepeats === 'true';
    const shuffle = req.query.shuffle !== 'false';
    const extra = Math.min(6, Math.max(0, Number(req.query.extra) || 0));
    const excludePresetId = typeof req.query.excludePresetId === 'string' ? req.query.excludePresetId : null;

    const treino = await recommendWorkout(user, { allowRepeats, shuffle, extraCount: extra, excludePresetId });
    if (!treino) {
      res.status(404).json({ error: 'Nenhum treino recomendado encontrado.' });
      return;
    }
    res.json(treino);
  } catch (error) {
    console.error('GET /api/presets/recommend error:', error);
    res.status(500).json({ error: 'Erro ao recomendar treino.' });
  }
});

presetsRouter.get('/recommended', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const presets = await getRecommendedPresetsList(user);

    res.json(presets);
  } catch (error) {
    console.error('GET /api/presets/recommended error:', error);
    res.status(500).json({ error: 'Erro ao buscar recomendações.' });
  }
});

presetsRouter.get('/:id', async (req, res) => {
  try {
    const preset = await WorkoutPreset.findById(req.params.id);
    if (!preset) {
      res.status(404).json({ error: 'Preset não encontrado.' });
      return;
    }
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar preset.' });
  }
});
