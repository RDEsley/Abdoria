import { Router } from 'express';
import { User, sanitizeUser } from '../models/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { calcImc, suggestNivel } from '../types/index.js';
import { mergePreferencias, mergeSimulacaoDefinicao } from '../utils/user-patch.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

async function loadCurrentUser(userId: string) {
  return User.findById(userId).lean();
}

usersRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await loadCurrentUser(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('GET /api/users/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

usersRouter.patch('/me', async (req: AuthRequest, res) => {
  try {
    const current = await loadCurrentUser(req.userId!);
    if (!current) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const allowed = [
      'nome', 'idade', 'peso_kg', 'altura_cm', 'nivel', 'objetivo',
      'simulacao_definicao', 'preferencias',
    ] as const;
    const update: Record<string, unknown> = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (req.body.preferencias !== undefined) {
      update.preferencias = mergePreferencias(current.preferencias, req.body.preferencias);
    }

    if (req.body.simulacao_definicao !== undefined) {
      update.simulacao_definicao = mergeSimulacaoDefinicao(
        current.simulacao_definicao,
        req.body.simulacao_definicao,
      );
    }

    if (update.peso_kg && update.altura_cm) {
      update.imc = calcImc(Number(update.peso_kg), Number(update.altura_cm));
    } else if (update.peso_kg || update.altura_cm) {
      if (current.peso_kg && current.altura_cm) {
        const peso = Number(update.peso_kg ?? current.peso_kg);
        const altura = Number(update.altura_cm ?? current.altura_cm);
        update.imc = calcImc(peso, altura);
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true, runValidators: true }).lean();

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('PATCH /api/users/me error:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

usersRouter.patch('/me/onboarding', async (req: AuthRequest, res) => {
  try {
    const current = await loadCurrentUser(req.userId!);
    if (!current) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    const fields = ['nome', 'idade', 'peso_kg', 'altura_cm', 'nivel', 'objetivo', 'simulacao_definicao', 'preferencias', 'onboarding_completed'] as const;
    for (const key of fields) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    if (body.preferencias !== undefined) {
      update.preferencias = mergePreferencias(current.preferencias, body.preferencias);
    }

    if (body.simulacao_definicao !== undefined) {
      update.simulacao_definicao = mergeSimulacaoDefinicao(
        current.simulacao_definicao,
        body.simulacao_definicao,
      );
    }

    if (body.terms_accepted === true) {
      update.terms_accepted_at = new Date();
    }

    if (update.peso_kg != null && update.altura_cm != null) {
      update.imc = calcImc(Number(update.peso_kg), Number(update.altura_cm));
    }

    if (update.idade && update.imc && body.nivel === undefined && !update.nivel) {
      update.nivel = suggestNivel(Number(update.idade), Number(update.imc));
    }

    if (body.skip && !update.onboarding_completed) {
      update.onboarding_completed = true;
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true, runValidators: true }).lean();

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('PATCH /api/users/me/onboarding error:', error);
    res.status(500).json({ error: 'Erro no onboarding.' });
  }
});
