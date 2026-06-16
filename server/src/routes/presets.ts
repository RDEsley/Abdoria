import { Router } from 'express';
import { WorkoutPreset } from '../models/WorkoutPreset.js';
import { User } from '../models/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const presetsRouter = Router();

presetsRouter.use(requireAuth);

presetsRouter.get('/', async (_req, res) => {
  try {
    const presets = await WorkoutPreset.find().sort({ ciclo_id: 1, nivel: 1 }).lean();
    res.json(presets);
  } catch (error) {
    console.error('GET /api/presets error:', error);
    res.status(500).json({ error: 'Erro ao buscar presets.' });
  }
});

presetsRouter.get('/recommended', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const ciclo = user.preferencias?.ciclo_treinos ?? ['A', 'B', 'C'];

    const presets = await WorkoutPreset.find({
      nivel: user.nivel,
      objetivo: user.objetivo,
      ciclo_id: { $in: ciclo },
      recomendado: true,
    }).lean();

    res.json(presets);
  } catch (error) {
    console.error('GET /api/presets/recommended error:', error);
    res.status(500).json({ error: 'Erro ao buscar recomendações.' });
  }
});

presetsRouter.get('/:id', async (req, res) => {
  try {
    const preset = await WorkoutPreset.findById(req.params.id).lean();
    if (!preset) {
      res.status(404).json({ error: 'Preset não encontrado.' });
      return;
    }
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar preset.' });
  }
});
