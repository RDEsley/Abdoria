import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  FoodLogs,
  Foods,
  NutritionProfiles,
  WeightLogs,
} from '../repositories/nutrition-repository.js';
import {
  balanceSuggestions,
  estimateNutritionTargets,
  FOOD_NAME_MAX,
  FOOD_NOTE_MAX,
  FOOD_SEARCH_LIMIT,
  MEAL_TYPE_LABELS,
  USER_FOODS_MAX,
  validateFoodMacros,
  type MealType,
  type NutritionGoal,
  type NutritionTargetMode,
} from '../../../shared/nutrition/index.js';
import { getTodaySaoPaulo, addDaysSaoPaulo } from '../../../shared/utils/timezone.js';
import { User } from '../domain/User.js';

export const nutritionRouter = Router();
nutritionRouter.use(requireAuth);

function readErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    return Number((error as { status?: number }).status) || 500;
  }
  return 500;
}

function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && value in MEAL_TYPE_LABELS;
}

nutritionRouter.get('/profile', async (req: AuthRequest, res) => {
  try {
    const profile = await NutritionProfiles.getOrNull(req.userId!);
    res.json(profile);
  } catch (error) {
    console.error('GET /api/nutrition/profile error:', error);
    res.status(500).json({ error: 'Erro ao carregar perfil nutricional.' });
  }
});

nutritionRouter.put('/profile', async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    const goal = (body.goal as NutritionGoal) ?? undefined;
    let target_mode = body.target_mode as NutritionTargetMode | undefined;
    let calorie_target =
      body.calorie_target != null ? Math.round(Number(body.calorie_target)) : undefined;
    let protein_target_g =
      body.protein_target_g != null ? Number(body.protein_target_g) : undefined;
    let carbs_target_g = body.carbs_target_g != null ? Number(body.carbs_target_g) : undefined;
    let fat_target_g = body.fat_target_g != null ? Number(body.fat_target_g) : undefined;
    let activity_factor =
      body.activity_factor != null ? Number(body.activity_factor) : undefined;

    if (target_mode === 'estimated' || body.reestimate === true) {
      const user = await User.findById(req.userId!);
      const estimated = estimateNutritionTargets({
        goal: goal ?? 'maintain',
        sexo: user?.simulacao_definicao?.sexo ?? null,
        idade: user?.idade ?? null,
        peso_kg: user?.peso_kg ?? null,
        altura_cm: user?.altura_cm ?? null,
        activity_factor,
      });
      if (!estimated) {
        res.status(400).json({
          error:
            'Não foi possível estimar a meta. Informe peso, altura, idade e sexo, ou use meta manual.',
          missing: ['peso', 'altura', 'idade', 'sexo'],
        });
        return;
      }
      target_mode = 'estimated';
      calorie_target = estimated.calorie_target;
      protein_target_g = estimated.protein_target_g;
      carbs_target_g = estimated.carbs_target_g;
      fat_target_g = estimated.fat_target_g;
      activity_factor = estimated.activity_factor;
    }

    if (calorie_target != null && (calorie_target < 1000 || calorie_target > 6000)) {
      res.status(400).json({ error: 'Meta calórica fora do intervalo razoável.' });
      return;
    }

    const profile = await NutritionProfiles.upsert(req.userId!, {
      goal,
      target_mode,
      calorie_target,
      protein_target_g,
      carbs_target_g,
      fat_target_g,
      activity_factor,
      preferences: body.preferences,
      setup_completed_at:
        body.setup_completed === true ? new Date().toISOString() : body.setup_completed_at,
    });
    res.json(profile);
  } catch (error) {
    console.error('PUT /api/nutrition/profile error:', error);
    res.status(500).json({ error: 'Erro ao salvar perfil nutricional.' });
  }
});

nutritionRouter.get('/foods', async (req: AuthRequest, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const mode = typeof req.query.mode === 'string' ? req.query.mode : 'search';
    if (mode === 'recent') {
      res.json(await Foods.recent(req.userId!));
      return;
    }
    if (mode === 'favorites') {
      res.json(await Foods.favorites(req.userId!));
      return;
    }
    res.json(await Foods.search(req.userId!, q, FOOD_SEARCH_LIMIT));
  } catch (error) {
    console.error('GET /api/nutrition/foods error:', error);
    res.status(500).json({ error: 'Erro ao buscar alimentos.' });
  }
});

nutritionRouter.post('/foods', async (req: AuthRequest, res) => {
  try {
    const existing = await Foods.search(req.userId!, '', 500);
    const userCount = existing.filter((f) => f.source === 'user').length;
    if (userCount >= USER_FOODS_MAX) {
      res.status(400).json({ error: 'Limite de alimentos próprios atingido.' });
      return;
    }
    const name = String(req.body?.name ?? '').trim().slice(0, FOOD_NAME_MAX);
    const validation = validateFoodMacros({
      name,
      calories: Number(req.body?.calories),
      protein_g: Number(req.body?.protein_g),
      carbs_g: Number(req.body?.carbs_g),
      fat_g: Number(req.body?.fat_g),
      fiber_g: req.body?.fiber_g != null ? Number(req.body.fiber_g) : null,
      serving_grams: req.body?.serving_grams != null ? Number(req.body.serving_grams) : null,
    });
    if (validation) {
      res.status(400).json({ error: validation });
      return;
    }
    const created = await Foods.createUserFood(req.userId!, {
      name,
      brand: req.body?.brand ? String(req.body.brand).slice(0, 60) : null,
      serving_description: String(req.body?.serving_description ?? 'porção').slice(0, 80),
      serving_grams: req.body?.serving_grams != null ? Number(req.body.serving_grams) : null,
      calories: Number(req.body.calories),
      protein_g: Number(req.body.protein_g),
      carbs_g: Number(req.body.carbs_g),
      fat_g: Number(req.body.fat_g),
      fiber_g: req.body?.fiber_g != null ? Number(req.body.fiber_g) : null,
      sodium_mg: req.body?.sodium_mg != null ? Number(req.body.sodium_mg) : null,
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/nutrition/foods error:', error);
    res.status(readErrorStatus(error)).json({ error: 'Erro ao criar alimento.' });
  }
});

nutritionRouter.patch('/foods/:id', async (req: AuthRequest, res) => {
  try {
    const updated = await Foods.updateUserFood(req.userId!, String(req.params.id), {
      name: req.body?.name,
      brand: req.body?.brand,
      serving_description: req.body?.serving_description,
      serving_grams: req.body?.serving_grams,
      calories: req.body?.calories,
      protein_g: req.body?.protein_g,
      carbs_g: req.body?.carbs_g,
      fat_g: req.body?.fat_g,
      fiber_g: req.body?.fiber_g,
      sodium_mg: req.body?.sodium_mg,
    });
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/nutrition/foods/:id error:', error);
    res.status(500).json({ error: 'Erro ao editar alimento.' });
  }
});

nutritionRouter.delete('/foods/:id', async (req: AuthRequest, res) => {
  try {
    await Foods.archiveUserFood(req.userId!, String(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/nutrition/foods/:id error:', error);
    res.status(500).json({ error: 'Erro ao arquivar alimento.' });
  }
});

nutritionRouter.post('/foods/:id/favorite', async (req: AuthRequest, res) => {
  try {
    const favorite = req.body?.favorite !== false;
    await Foods.setFavorite(req.userId!, String(req.params.id), favorite);
    res.json({ ok: true, favorite });
  } catch (error) {
    console.error('POST /api/nutrition/foods/:id/favorite error:', error);
    res.status(500).json({ error: 'Erro ao atualizar favorito.' });
  }
});

nutritionRouter.get('/day', async (req: AuthRequest, res) => {
  try {
    const dayKey =
      typeof req.query.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.day)
        ? req.query.day
        : getTodaySaoPaulo();
    const profile = await NutritionProfiles.getOrNull(req.userId!);
    const summary = await FoodLogs.daySummary(req.userId!, dayKey, profile);
    const remaining = {
      calories: (profile?.calorie_target ?? 0) - summary.totals.calories,
      protein_g: (profile?.protein_target_g ?? 0) - summary.totals.protein_g,
      carbs_g: (profile?.carbs_target_g ?? 0) - summary.totals.carbs_g,
      fat_g: (profile?.fat_target_g ?? 0) - summary.totals.fat_g,
    };
    const suggestions =
      profile?.target_mode === 'none'
        ? []
        : balanceSuggestions({
            remaining,
            vegetarian: profile?.preferences?.vegetarian,
            vegan: profile?.preferences?.vegan,
          });
    res.json({ ...summary, suggestions });
  } catch (error) {
    console.error('GET /api/nutrition/day error:', error);
    res.status(500).json({ error: 'Erro ao carregar o dia.' });
  }
});

nutritionRouter.post('/logs', async (req: AuthRequest, res) => {
  try {
    if (!isMealType(req.body?.meal_type)) {
      res.status(400).json({ error: 'Tipo de refeição inválido.' });
      return;
    }
    const foodId = String(req.body?.food_id ?? '');
    const food = await Foods.get(foodId);
    if (!food || food.archived_at) {
      res.status(404).json({ error: 'Alimento não encontrado.' });
      return;
    }
    if (food.source === 'user' && food.owner_user_id !== req.userId) {
      res.status(404).json({ error: 'Alimento não encontrado.' });
      return;
    }
    const dayKey =
      typeof req.body?.day_key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.day_key)
        ? req.body.day_key
        : getTodaySaoPaulo();
    const created = await FoodLogs.create(req.userId!, {
      food,
      meal_type: req.body.meal_type,
      quantity: req.body?.quantity != null ? Number(req.body.quantity) : undefined,
      grams: req.body?.grams != null ? Number(req.body.grams) : undefined,
      day_key: dayKey,
      eaten_at: typeof req.body?.eaten_at === 'string' ? req.body.eaten_at : undefined,
      note:
        typeof req.body?.note === 'string' ? req.body.note.slice(0, FOOD_NOTE_MAX) : null,
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/nutrition/logs error:', error);
    res.status(500).json({ error: 'Erro ao registrar alimento.' });
  }
});

nutritionRouter.patch('/logs/:id', async (req: AuthRequest, res) => {
  try {
    const food =
      req.body?.food_id != null ? await Foods.get(String(req.body.food_id)) : undefined;
    const updated = await FoodLogs.update(req.userId!, String(req.params.id), {
      meal_type: isMealType(req.body?.meal_type) ? req.body.meal_type : undefined,
      quantity: req.body?.quantity != null ? Number(req.body.quantity) : undefined,
      grams: req.body?.grams !== undefined ? Number(req.body.grams) : undefined,
      note:
        typeof req.body?.note === 'string' ? req.body.note.slice(0, FOOD_NOTE_MAX) : undefined,
      food: food ?? undefined,
    });
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/nutrition/logs/:id error:', error);
    res.status(500).json({ error: 'Erro ao editar registro.' });
  }
});

nutritionRouter.delete('/logs/:id', async (req: AuthRequest, res) => {
  try {
    await FoodLogs.remove(req.userId!, String(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/nutrition/logs/:id error:', error);
    res.status(500).json({ error: 'Erro ao remover registro.' });
  }
});

nutritionRouter.post('/logs/repeat-meal', async (req: AuthRequest, res) => {
  try {
    const fromDay =
      typeof req.body?.from_day === 'string' ? req.body.from_day : getTodaySaoPaulo();
    const toDay = typeof req.body?.to_day === 'string' ? req.body.to_day : getTodaySaoPaulo();
    if (!isMealType(req.body?.meal_type)) {
      res.status(400).json({ error: 'Tipo de refeição inválido.' });
      return;
    }
    const sourceLogs = (await FoodLogs.listDay(req.userId!, fromDay)).filter(
      (log) => log.meal_type === req.body.meal_type,
    );
    if (sourceLogs.length === 0) {
      res.status(404).json({ error: 'Nenhum item nessa refeição.' });
      return;
    }
    const created = [];
    for (const log of sourceLogs) {
      const food = log.food_id ? await Foods.get(log.food_id) : null;
      if (!food) continue;
      created.push(
        await FoodLogs.create(req.userId!, {
          food,
          meal_type: log.meal_type,
          quantity: log.quantity,
          grams: log.grams ?? undefined,
          day_key: toDay,
        }),
      );
    }
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/nutrition/logs/repeat-meal error:', error);
    res.status(500).json({ error: 'Erro ao repetir refeição.' });
  }
});

nutritionRouter.get('/weight', async (req: AuthRequest, res) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const to = getTodaySaoPaulo();
    const from = addDaysSaoPaulo(to, -(days - 1));
    const [logs, latest] = await Promise.all([
      WeightLogs.list(req.userId!, from, to),
      WeightLogs.latest(req.userId!),
    ]);
    res.json({ from, to, logs, latest });
  } catch (error) {
    console.error('GET /api/nutrition/weight error:', error);
    res.status(500).json({ error: 'Erro ao carregar peso.' });
  }
});

nutritionRouter.post('/weight', async (req: AuthRequest, res) => {
  try {
    const weight = Number(req.body?.weight_kg);
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
      res.status(400).json({ error: 'Peso inválido.' });
      return;
    }
    const dayKey =
      typeof req.body?.day_key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.day_key)
        ? req.body.day_key
        : getTodaySaoPaulo();
    const saved = await WeightLogs.upsert(req.userId!, {
      weight_kg: Math.round(weight * 10) / 10,
      day_key: dayKey,
      note: typeof req.body?.note === 'string' ? req.body.note.slice(0, FOOD_NOTE_MAX) : null,
    });
    // Espelha no perfil do usuário quando é o dia de hoje (fonte leve para metas).
    if (dayKey === getTodaySaoPaulo()) {
      try {
        await User.findByIdAndUpdate(req.userId!, { $set: { peso_kg: saved.weight_kg } });
      } catch {
        /* não bloqueia o log de peso */
      }
    }
    res.status(201).json(saved);
  } catch (error) {
    console.error('POST /api/nutrition/weight error:', error);
    res.status(500).json({ error: 'Erro ao registrar peso.' });
  }
});
