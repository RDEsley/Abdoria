import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  FoodLogs,
  Foods,
  NutritionProfiles,
  Recipes,
  WeightLogs,
} from '../repositories/nutrition-repository.js';
import {
  balanceSuggestions,
  estimateNutritionTargets,
  FOOD_NAME_MAX,
  FOOD_NOTE_MAX,
  FOOD_SEARCH_LIMIT,
  MEAL_TYPE_LABELS,
  RECIPE_DESC_MAX,
  RECIPE_DIFFICULTIES,
  RECIPE_NAME_MAX,
  RECIPE_NOTE_MAX,
  RECIPE_SEARCH_LIMIT,
  USER_FOODS_MAX,
  USER_RECIPES_MAX,
  validateFoodMacros,
  type MealType,
  type NutritionGoal,
  type NutritionTargetMode,
  type RecipeDifficulty,
  type RecipeItemInput,
} from '../../../shared/nutrition/index.js';
import { getTodaySaoPaulo, addDaysSaoPaulo } from '../../../shared/utils/timezone.js';
import { User } from '../domain/User.js';
import { recordValidDailyAction } from '../services/active-day.js';
import { syncUserGamification } from '../services/gamification.js';

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
    // Sem XP por alimento — só Dia Ativo (dedupe por day_key em ActiveDays.record).
    await recordValidDailyAction(req.userId!, 'nutrition');
    void syncUserGamification(req.userId!).catch(() => undefined);
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
    if (created.length > 0) {
      await recordValidDailyAction(req.userId!, 'nutrition');
      void syncUserGamification(req.userId!).catch(() => undefined);
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

nutritionRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const to = getTodaySaoPaulo();
    const from = addDaysSaoPaulo(to, -(days - 1));
    const days_with_logs = await FoodLogs.countLoggedDays(req.userId!, from, to);
    res.json({ from, to, days, days_with_logs });
  } catch (error) {
    console.error('GET /api/nutrition/stats error:', error);
    res.status(500).json({ error: 'Erro ao carregar estatísticas.' });
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

function isRecipeDifficulty(value: unknown): value is RecipeDifficulty {
  return typeof value === 'string' && (RECIPE_DIFFICULTIES as string[]).includes(value);
}

function parseRecipeItems(raw: unknown): RecipeItemInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items: RecipeItemInput[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i] as Record<string, unknown>;
    const food_id = String(row?.food_id ?? '').trim();
    if (!food_id) return null;
    items.push({
      food_id,
      quantity: row?.quantity != null ? Number(row.quantity) : 1,
      grams: row?.grams != null ? Number(row.grams) : null,
      position: row?.position != null ? Number(row.position) : i,
      note: typeof row?.note === 'string' ? row.note.slice(0, RECIPE_NOTE_MAX) : null,
    });
  }
  return items;
}

nutritionRouter.get('/recipes', async (req: AuthRequest, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const meal_type = isMealType(req.query.meal_type) ? req.query.meal_type : undefined;
    const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
    const sourceRaw = typeof req.query.source === 'string' ? req.query.source : 'all';
    const source =
      sourceRaw === 'global' || sourceRaw === 'user' || sourceRaw === 'all' ? sourceRaw : 'all';
    const favorites_only =
      req.query.favorites === '1' ||
      req.query.favorites === 'true' ||
      req.query.mode === 'favorites';
    res.json(
      await Recipes.list(req.userId!, {
        q,
        meal_type,
        tag,
        source,
        favorites_only,
        limit: RECIPE_SEARCH_LIMIT,
      }),
    );
  } catch (error) {
    console.error('GET /api/nutrition/recipes error:', error);
    res.status(500).json({ error: 'Erro ao listar receitas.' });
  }
});

nutritionRouter.get('/recipes/:id', async (req: AuthRequest, res) => {
  try {
    const recipe = await Recipes.getById(req.userId!, String(req.params.id));
    if (!recipe) {
      res.status(404).json({ error: 'Receita não encontrada.' });
      return;
    }
    res.json(recipe);
  } catch (error) {
    console.error('GET /api/nutrition/recipes/:id error:', error);
    res.status(500).json({ error: 'Erro ao carregar receita.' });
  }
});

nutritionRouter.post('/recipes', async (req: AuthRequest, res) => {
  try {
    const existing = await Recipes.list(req.userId!, { source: 'user', limit: 500 });
    if (existing.length >= USER_RECIPES_MAX) {
      res.status(400).json({ error: 'Limite de receitas próprias atingido.' });
      return;
    }
    const name = String(req.body?.name ?? '').trim().slice(0, RECIPE_NAME_MAX);
    if (!name) {
      res.status(400).json({ error: 'Nome obrigatório.' });
      return;
    }
    const items = parseRecipeItems(req.body?.items);
    if (!items) {
      res.status(400).json({ error: 'Informe ao menos um alimento na receita.' });
      return;
    }
    for (const item of items) {
      const food = await Foods.get(item.food_id);
      if (!food || food.archived_at) {
        res.status(400).json({ error: 'Alimento inválido na receita.' });
        return;
      }
      if (food.source === 'user' && food.owner_user_id !== req.userId) {
        res.status(400).json({ error: 'Alimento inválido na receita.' });
        return;
      }
    }
    const created = await Recipes.createUserRecipe(req.userId!, {
      name,
      description:
        typeof req.body?.description === 'string'
          ? req.body.description.slice(0, RECIPE_DESC_MAX)
          : null,
      servings: req.body?.servings != null ? Number(req.body.servings) : 1,
      prep_minutes: req.body?.prep_minutes != null ? Number(req.body.prep_minutes) : null,
      difficulty: isRecipeDifficulty(req.body?.difficulty) ? req.body.difficulty : 'easy',
      meal_types: Array.isArray(req.body?.meal_types)
        ? req.body.meal_types.filter(isMealType)
        : [],
      tags: Array.isArray(req.body?.tags)
        ? req.body.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 20)
        : [],
      instructions: Array.isArray(req.body?.instructions)
        ? req.body.instructions.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 40)
        : [],
      items,
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/nutrition/recipes error:', error);
    res.status(readErrorStatus(error)).json({ error: 'Erro ao criar receita.' });
  }
});

nutritionRouter.patch('/recipes/:id', async (req: AuthRequest, res) => {
  try {
    const items = req.body?.items !== undefined ? parseRecipeItems(req.body.items) : undefined;
    if (req.body?.items !== undefined && !items) {
      res.status(400).json({ error: 'Itens da receita inválidos.' });
      return;
    }
    if (items) {
      for (const item of items) {
        const food = await Foods.get(item.food_id);
        if (!food || food.archived_at) {
          res.status(400).json({ error: 'Alimento inválido na receita.' });
          return;
        }
        if (food.source === 'user' && food.owner_user_id !== req.userId) {
          res.status(400).json({ error: 'Alimento inválido na receita.' });
          return;
        }
      }
    }
    const updated = await Recipes.updateUserRecipe(req.userId!, String(req.params.id), {
      name:
        typeof req.body?.name === 'string'
          ? req.body.name.trim().slice(0, RECIPE_NAME_MAX)
          : undefined,
      description:
        req.body?.description !== undefined
          ? String(req.body.description ?? '').slice(0, RECIPE_DESC_MAX)
          : undefined,
      servings: req.body?.servings != null ? Number(req.body.servings) : undefined,
      prep_minutes:
        req.body?.prep_minutes !== undefined
          ? req.body.prep_minutes == null
            ? null
            : Number(req.body.prep_minutes)
          : undefined,
      difficulty: isRecipeDifficulty(req.body?.difficulty) ? req.body.difficulty : undefined,
      meal_types: Array.isArray(req.body?.meal_types)
        ? req.body.meal_types.filter(isMealType)
        : undefined,
      tags: Array.isArray(req.body?.tags)
        ? req.body.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 20)
        : undefined,
      instructions: Array.isArray(req.body?.instructions)
        ? req.body.instructions.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 40)
        : undefined,
      items: items ?? undefined,
    });
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/nutrition/recipes/:id error:', error);
    res.status(500).json({ error: 'Erro ao editar receita.' });
  }
});

nutritionRouter.delete('/recipes/:id', async (req: AuthRequest, res) => {
  try {
    await Recipes.archiveUserRecipe(req.userId!, String(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/nutrition/recipes/:id error:', error);
    res.status(500).json({ error: 'Erro ao arquivar receita.' });
  }
});

nutritionRouter.post('/recipes/:id/favorite', async (req: AuthRequest, res) => {
  try {
    const favorite = req.body?.favorite !== false;
    await Recipes.setFavorite(req.userId!, String(req.params.id), favorite);
    res.json({ ok: true, favorite });
  } catch (error) {
    console.error('POST /api/nutrition/recipes/:id/favorite error:', error);
    res.status(500).json({ error: 'Erro ao atualizar favorito.' });
  }
});

nutritionRouter.post('/recipes/:id/log', async (req: AuthRequest, res) => {
  try {
    if (!isMealType(req.body?.meal_type)) {
      res.status(400).json({ error: 'Tipo de refeição inválido.' });
      return;
    }
    const dayKey =
      typeof req.body?.day_key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.day_key)
        ? req.body.day_key
        : getTodaySaoPaulo();
    const created = await Recipes.logAsMeal(req.userId!, String(req.params.id), {
      meal_type: req.body.meal_type,
      day_key: dayKey,
      servings: req.body?.servings != null ? Number(req.body.servings) : undefined,
      eaten_at: typeof req.body?.eaten_at === 'string' ? req.body.eaten_at : undefined,
      note:
        typeof req.body?.note === 'string' ? req.body.note.slice(0, FOOD_NOTE_MAX) : null,
    });
    if (created.length > 0) {
      await recordValidDailyAction(req.userId!, 'nutrition');
      void syncUserGamification(req.userId!).catch(() => undefined);
    }
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/nutrition/recipes/:id/log error:', error);
    const status = readErrorStatus(error);
    const message =
      error instanceof Error && status < 500 ? error.message : 'Erro ao registrar receita.';
    res.status(status).json({ error: message });
  }
});
