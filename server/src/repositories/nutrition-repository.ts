import { getSupabase } from '../db.js';
import {
  foldFoodName,
  MEAL_TYPE_ORDER,
  resolveServingMultiplier,
  scaleMacros,
  sumMacros,
  type DayNutritionSummary,
  type FoodLogRecord,
  type FoodRecord,
  type MealType,
  type NutritionMacros,
  type NutritionPreferences,
  type NutritionProfile,
  type RecipeDifficulty,
  type RecipeItemInput,
  type RecipeItemRecord,
  type RecipeRecord,
  type RecipeWriteInput,
  type WeightLogRecord,
} from '../../../shared/nutrition/index.js';
import { throwIfMissingRelation } from '../utils/schema-errors.js';

const RECIPE_LOG_NOTE_PREFIX = 'recipe:';
const RECIPE_DOUBLE_TAP_MS = 2000;

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function rowToFood(row: Record<string, unknown>, favorited = false): FoodRecord {
  return {
    id: String(row.id),
    owner_user_id: row.owner_user_id ? String(row.owner_user_id) : null,
    source: row.source === 'global' ? 'global' : 'user',
    name: String(row.name),
    brand: row.brand ? String(row.brand) : null,
    serving_description: String(row.serving_description ?? 'porção'),
    serving_grams: row.serving_grams != null ? num(row.serving_grams) : null,
    calories: num(row.calories),
    protein_g: num(row.protein_g),
    carbs_g: num(row.carbs_g),
    fat_g: num(row.fat_g),
    fiber_g: row.fiber_g != null ? num(row.fiber_g) : null,
    sodium_mg: row.sodium_mg != null ? num(row.sodium_mg) : null,
    name_fold: String(row.name_fold ?? foldFoodName(String(row.name))),
    verified: Boolean(row.verified),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    favorited,
  };
}

function rowToLog(row: Record<string, unknown>): FoodLogRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    food_id: row.food_id ? String(row.food_id) : null,
    food_name_snapshot: String(row.food_name_snapshot),
    serving_description_snapshot: String(row.serving_description_snapshot ?? 'porção'),
    serving_grams_snapshot:
      row.serving_grams_snapshot != null ? num(row.serving_grams_snapshot) : null,
    meal_type: row.meal_type as MealType,
    quantity: num(row.quantity, 1),
    grams: row.grams != null ? num(row.grams) : null,
    calories: num(row.calories),
    protein_g: num(row.protein_g),
    carbs_g: num(row.carbs_g),
    fat_g: num(row.fat_g),
    fiber_g: row.fiber_g != null ? num(row.fiber_g) : null,
    eaten_at: String(row.eaten_at),
    day_key: String(row.day_key).slice(0, 10),
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToWeight(row: Record<string, unknown>): WeightLogRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    weight_kg: num(row.weight_kg),
    day_key: String(row.day_key).slice(0, 10),
    recorded_at: String(row.recorded_at),
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at),
  };
}

function rowToProfile(row: Record<string, unknown>): NutritionProfile {
  return {
    user_id: String(row.user_id),
    goal: (row.goal as NutritionProfile['goal']) ?? 'track',
    target_mode: (row.target_mode as NutritionProfile['target_mode']) ?? 'none',
    calorie_target: row.calorie_target != null ? Math.round(num(row.calorie_target)) : null,
    protein_target_g: row.protein_target_g != null ? num(row.protein_target_g) : null,
    carbs_target_g: row.carbs_target_g != null ? num(row.carbs_target_g) : null,
    fat_target_g: row.fat_target_g != null ? num(row.fat_target_g) : null,
    activity_factor: row.activity_factor != null ? num(row.activity_factor) : null,
    setup_completed_at: row.setup_completed_at ? String(row.setup_completed_at) : null,
    preferences: (row.preferences as NutritionPreferences) ?? {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const NutritionProfiles = {
  async getOrNull(userId: string): Promise<NutritionProfile | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('nutrition_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    throwIfMissingRelation(error, 'nutrition_profiles');
    if (error) throw error;
    return data ? rowToProfile(data as Record<string, unknown>) : null;
  },

  async upsert(
    userId: string,
    patch: Partial<Omit<NutritionProfile, 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<NutritionProfile> {
    const sb = getSupabase();
    const existing = await this.getOrNull(userId);
    const payload = {
      user_id: userId,
      goal: patch.goal ?? existing?.goal ?? 'track',
      target_mode: patch.target_mode ?? existing?.target_mode ?? 'none',
      calorie_target:
        patch.calorie_target !== undefined ? patch.calorie_target : (existing?.calorie_target ?? null),
      protein_target_g:
        patch.protein_target_g !== undefined
          ? patch.protein_target_g
          : (existing?.protein_target_g ?? null),
      carbs_target_g:
        patch.carbs_target_g !== undefined ? patch.carbs_target_g : (existing?.carbs_target_g ?? null),
      fat_target_g:
        patch.fat_target_g !== undefined ? patch.fat_target_g : (existing?.fat_target_g ?? null),
      activity_factor:
        patch.activity_factor !== undefined
          ? patch.activity_factor
          : (existing?.activity_factor ?? null),
      setup_completed_at:
        patch.setup_completed_at !== undefined
          ? patch.setup_completed_at
          : (existing?.setup_completed_at ?? null),
      preferences: patch.preferences ?? existing?.preferences ?? {},
    };
    const { data, error } = await sb
      .from('nutrition_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();
    throwIfMissingRelation(error, 'nutrition_profiles');
    if (error) throw error;
    return rowToProfile(data as Record<string, unknown>);
  },
};

export const Foods = {
  async get(id: string): Promise<FoodRecord | null> {
    const sb = getSupabase();
    const { data, error } = await sb.from('foods').select('*').eq('id', id).maybeSingle();
    throwIfMissingRelation(error, 'foods');
    if (error) throw error;
    return data ? rowToFood(data as Record<string, unknown>) : null;
  },

  async search(
    userId: string,
    query: string,
    limit = 40,
  ): Promise<FoodRecord[]> {
    const sb = getSupabase();
    const fold = foldFoodName(query);
    const { data: favRows } = await sb
      .from('food_favorites')
      .select('food_id')
      .eq('user_id', userId);
    const favSet = new Set((favRows ?? []).map((row) => String(row.food_id)));

    let q = sb
      .from('foods')
      .select('*')
      .is('archived_at', null)
      .or(`source.eq.global,owner_user_id.eq.${userId}`)
      .limit(limit);

    if (fold) {
      q = q.ilike('name_fold', `%${fold}%`);
    } else {
      q = q.order('verified', { ascending: false }).order('name', { ascending: true });
    }

    const { data, error } = await q;
    throwIfMissingRelation(error, 'foods');
    if (error) throw error;
    return (data ?? []).map((row) =>
      rowToFood(row as Record<string, unknown>, favSet.has(String(row.id))),
    );
  },

  async recent(userId: string, limit = 12): Promise<FoodRecord[]> {
    const sb = getSupabase();
    const { data: logs, error } = await sb
      .from('food_logs')
      .select('food_id')
      .eq('user_id', userId)
      .not('food_id', 'is', null)
      .order('eaten_at', { ascending: false })
      .limit(40);
    throwIfMissingRelation(error, 'food_logs');
    if (error) throw error;
    const ids: string[] = [];
    for (const row of logs ?? []) {
      const id = row.food_id ? String(row.food_id) : '';
      if (id && !ids.includes(id)) ids.push(id);
      if (ids.length >= limit) break;
    }
    if (ids.length === 0) return [];
    const { data, error: foodsError } = await sb.from('foods').select('*').in('id', ids);
    if (foodsError) throw foodsError;
    const map = new Map(
      (data ?? []).map((row) => [String(row.id), rowToFood(row as Record<string, unknown>)]),
    );
    return ids.map((id) => map.get(id)).filter(Boolean) as FoodRecord[];
  },

  async favorites(userId: string): Promise<FoodRecord[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('food_favorites')
      .select('food_id, foods(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    throwIfMissingRelation(error, 'food_favorites');
    if (error) throw error;
    return (data ?? [])
      .map((row) => {
        const food = (row as unknown as { foods?: Record<string, unknown> | null }).foods;
        return food ? rowToFood(food, true) : null;
      })
      .filter(Boolean) as FoodRecord[];
  },

  async createUserFood(
    userId: string,
    input: Omit<FoodRecord, 'id' | 'owner_user_id' | 'source' | 'name_fold' | 'verified' | 'archived_at' | 'created_at' | 'updated_at' | 'favorited'>,
  ): Promise<FoodRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('foods')
      .insert({
        owner_user_id: userId,
        source: 'user',
        name: input.name.trim(),
        brand: input.brand,
        serving_description: input.serving_description,
        serving_grams: input.serving_grams,
        calories: input.calories,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        fiber_g: input.fiber_g,
        sodium_mg: input.sodium_mg,
        name_fold: foldFoodName(input.name),
        verified: false,
      })
      .select('*')
      .single();
    throwIfMissingRelation(error, 'foods');
    if (error) throw error;
    return rowToFood(data as Record<string, unknown>);
  },

  async updateUserFood(
    userId: string,
    id: string,
    patch: Partial<FoodRecord>,
  ): Promise<FoodRecord> {
    const sb = getSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.name != null) {
      payload.name = patch.name.trim();
      payload.name_fold = foldFoodName(patch.name);
    }
    if (patch.brand !== undefined) payload.brand = patch.brand;
    if (patch.serving_description != null) payload.serving_description = patch.serving_description;
    if (patch.serving_grams !== undefined) payload.serving_grams = patch.serving_grams;
    if (patch.calories != null) payload.calories = patch.calories;
    if (patch.protein_g != null) payload.protein_g = patch.protein_g;
    if (patch.carbs_g != null) payload.carbs_g = patch.carbs_g;
    if (patch.fat_g != null) payload.fat_g = patch.fat_g;
    if (patch.fiber_g !== undefined) payload.fiber_g = patch.fiber_g;
    if (patch.sodium_mg !== undefined) payload.sodium_mg = patch.sodium_mg;
    const { data, error } = await sb
      .from('foods')
      .update(payload)
      .eq('id', id)
      .eq('owner_user_id', userId)
      .eq('source', 'user')
      .select('*')
      .single();
    if (error) throw error;
    return rowToFood(data as Record<string, unknown>);
  },

  async archiveUserFood(userId: string, id: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from('foods')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_user_id', userId)
      .eq('source', 'user');
    if (error) throw error;
  },

  async setFavorite(userId: string, foodId: string, favorite: boolean): Promise<void> {
    const sb = getSupabase();
    if (favorite) {
      const { error } = await sb
        .from('food_favorites')
        .upsert({ user_id: userId, food_id: foodId }, { onConflict: 'user_id,food_id' });
      if (error) throw error;
      return;
    }
    const { error } = await sb
      .from('food_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('food_id', foodId);
    if (error) throw error;
  },
};

export const FoodLogs = {
  async listDay(userId: string, dayKey: string): Promise<FoodLogRecord[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('day_key', dayKey)
      .order('eaten_at', { ascending: true });
    throwIfMissingRelation(error, 'food_logs');
    if (error) throw error;
    return (data ?? []).map((row) => rowToLog(row as Record<string, unknown>));
  },

  /** Logs inclusivos por day_key (America/Sao_Paulo civil). */
  async listBetween(userId: string, fromDay: string, toDay: string): Promise<FoodLogRecord[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('day_key', fromDay)
      .lte('day_key', toDay)
      .order('day_key', { ascending: true })
      .order('eaten_at', { ascending: true });
    throwIfMissingRelation(error, 'food_logs');
    if (error) throw error;
    return (data ?? []).map((row) => rowToLog(row as Record<string, unknown>));
  },

  async countAll(userId: string): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('food_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    throwIfMissingRelation(error, 'food_logs');
    if (error) throw error;
    return count ?? 0;
  },

  /** Contadores leves para conquistas/quests de nutrição. */
  async nutritionStats(userId: string): Promise<{
    totalLogs: number;
    distinctDays: number;
    recipeMealEvents: number;
    distinctRecipeIds: number;
  }> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('food_logs')
      .select('day_key, meal_type, note')
      .eq('user_id', userId);
    throwIfMissingRelation(error, 'food_logs');
    if (error) throw error;
    const rows = data ?? [];
    const days = new Set<string>();
    const recipeEvents = new Set<string>();
    const recipeIds = new Set<string>();
    for (const row of rows) {
      const dayKey = String(row.day_key ?? '');
      if (dayKey) days.add(dayKey);
      const note = row.note ? String(row.note) : '';
      if (!note.startsWith(RECIPE_LOG_NOTE_PREFIX)) continue;
      const recipeId = note.slice(RECIPE_LOG_NOTE_PREFIX.length).split(/[\s—-]/)[0] ?? '';
      if (!recipeId) continue;
      recipeIds.add(recipeId);
      recipeEvents.add(`${dayKey}|${String(row.meal_type)}|${recipeId}`);
    }
    return {
      totalLogs: rows.length,
      distinctDays: days.size,
      recipeMealEvents: recipeEvents.size,
      distinctRecipeIds: recipeIds.size,
    };
  },

  async create(
    userId: string,
    input: {
      food: FoodRecord;
      meal_type: MealType;
      quantity?: number;
      grams?: number;
      day_key: string;
      eaten_at?: string;
      note?: string | null;
    },
  ): Promise<FoodLogRecord> {
    const multiplier = resolveServingMultiplier({
      quantity: input.quantity,
      grams: input.grams,
      serving_grams: input.food.serving_grams,
    });
    const scaled = scaleMacros(
      {
        calories: input.food.calories,
        protein_g: input.food.protein_g,
        carbs_g: input.food.carbs_g,
        fat_g: input.food.fat_g,
        fiber_g: input.food.fiber_g,
      },
      multiplier,
    );
    const sb = getSupabase();
    const { data, error } = await sb
      .from('food_logs')
      .insert({
        user_id: userId,
        food_id: input.food.id,
        food_name_snapshot: input.food.name,
        serving_description_snapshot: input.food.serving_description,
        serving_grams_snapshot: input.food.serving_grams,
        meal_type: input.meal_type,
        quantity: input.quantity ?? multiplier,
        grams: input.grams ?? null,
        calories: scaled.calories,
        protein_g: scaled.protein_g,
        carbs_g: scaled.carbs_g,
        fat_g: scaled.fat_g,
        fiber_g: scaled.fiber_g,
        day_key: input.day_key,
        eaten_at: input.eaten_at ?? new Date().toISOString(),
        note: input.note ?? null,
      })
      .select('*')
      .single();
    throwIfMissingRelation(error, 'food_logs');
    if (error) throw error;
    return rowToLog(data as Record<string, unknown>);
  },

  async update(
    userId: string,
    id: string,
    patch: Partial<{
      meal_type: MealType;
      quantity: number;
      grams: number | null;
      note: string | null;
      food: FoodRecord;
    }>,
  ): Promise<FoodLogRecord> {
    const sb = getSupabase();
    const existing = await sb
      .from('food_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (existing.error) throw existing.error;
    const current = rowToLog(existing.data as Record<string, unknown>);
    const food =
      patch.food ??
      (current.food_id ? await Foods.get(current.food_id) : null);

    const payload: Record<string, unknown> = {};
    if (patch.meal_type) payload.meal_type = patch.meal_type;
    if (patch.note !== undefined) payload.note = patch.note;

    if (patch.quantity != null || patch.grams !== undefined || patch.food) {
      const base = food
        ? {
            calories: food.calories,
            protein_g: food.protein_g,
            carbs_g: food.carbs_g,
            fat_g: food.fat_g,
            fiber_g: food.fiber_g,
          }
        : {
            calories: current.calories / Math.max(current.quantity, 0.001),
            protein_g: current.protein_g / Math.max(current.quantity, 0.001),
            carbs_g: current.carbs_g / Math.max(current.quantity, 0.001),
            fat_g: current.fat_g / Math.max(current.quantity, 0.001),
            fiber_g: (current.fiber_g ?? 0) / Math.max(current.quantity, 0.001),
          };
      const multiplier = resolveServingMultiplier({
        quantity: patch.quantity ?? current.quantity,
        grams: patch.grams !== undefined ? patch.grams : current.grams,
        serving_grams: food?.serving_grams ?? current.serving_grams_snapshot,
      });
      const scaled = scaleMacros(base, multiplier);
      payload.quantity = patch.quantity ?? current.quantity;
      if (patch.grams !== undefined) payload.grams = patch.grams;
      payload.calories = scaled.calories;
      payload.protein_g = scaled.protein_g;
      payload.carbs_g = scaled.carbs_g;
      payload.fat_g = scaled.fat_g;
      payload.fiber_g = scaled.fiber_g;
      if (food) {
        payload.food_id = food.id;
        payload.food_name_snapshot = food.name;
        payload.serving_description_snapshot = food.serving_description;
        payload.serving_grams_snapshot = food.serving_grams;
      }
    }

    const { data, error } = await sb
      .from('food_logs')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return rowToLog(data as Record<string, unknown>);
  },

  async remove(userId: string, id: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('food_logs').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  async daySummary(userId: string, dayKey: string, profile: NutritionProfile | null): Promise<DayNutritionSummary> {
    const logs = await this.listDay(userId, dayKey);
    const meals = MEAL_TYPE_ORDER.map((meal_type) => {
      const mealLogs = logs.filter((log) => log.meal_type === meal_type);
      return {
        meal_type,
        logs: mealLogs,
        totals: sumMacros(mealLogs),
      };
    }).filter((meal) => meal.logs.length > 0);

    return {
      day_key: dayKey,
      totals: sumMacros(logs),
      targets: {
        calorie_target: profile?.calorie_target ?? null,
        protein_target_g: profile?.protein_target_g ?? null,
        carbs_target_g: profile?.carbs_target_g ?? null,
        fat_target_g: profile?.fat_target_g ?? null,
        target_mode: profile?.target_mode ?? 'none',
      },
      meals,
      log_count: logs.length,
    };
  },

  /** Dias distintos com pelo menos um log no intervalo [from, to] (chaves SP). */
  async countLoggedDays(userId: string, from: string, to: string): Promise<number> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('food_logs')
      .select('day_key')
      .eq('user_id', userId)
      .gte('day_key', from)
      .lte('day_key', to);
    throwIfMissingRelation(error, 'food_logs');
    if (error) throw error;
    const keys = new Set((data ?? []).map((row) => String((row as { day_key: string }).day_key)));
    return keys.size;
  },
};

export const WeightLogs = {
  async list(userId: string, from: string, to: string): Promise<WeightLogRecord[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('day_key', from)
      .lte('day_key', to)
      .order('day_key', { ascending: true });
    throwIfMissingRelation(error, 'weight_logs');
    if (error) throw error;
    return (data ?? []).map((row) => rowToWeight(row as Record<string, unknown>));
  },

  async upsert(
    userId: string,
    input: { weight_kg: number; day_key: string; note?: string | null },
  ): Promise<WeightLogRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('weight_logs')
      .upsert(
        {
          user_id: userId,
          weight_kg: input.weight_kg,
          day_key: input.day_key,
          recorded_at: new Date().toISOString(),
          note: input.note ?? null,
        },
        { onConflict: 'user_id,day_key' },
      )
      .select('*')
      .single();
    throwIfMissingRelation(error, 'weight_logs');
    if (error) throw error;
    return rowToWeight(data as Record<string, unknown>);
  },

  async latest(userId: string): Promise<WeightLogRecord | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('day_key', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToWeight(data as Record<string, unknown>) : null;
  },
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asMealTypes(value: unknown): MealType[] {
  return asStringArray(value).filter((item): item is MealType =>
    MEAL_TYPE_ORDER.includes(item as MealType),
  );
}

function asInstructions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asDifficulty(value: unknown): RecipeDifficulty {
  if (value === 'medium' || value === 'hard' || value === 'easy') return value;
  return 'easy';
}

function rowToRecipeItem(
  row: Record<string, unknown>,
  food: FoodRecord | null = null,
): RecipeItemRecord {
  const quantity = num(row.quantity, 1);
  const grams = row.grams != null ? num(row.grams) : null;
  let macros: NutritionMacros | undefined;
  if (food) {
    const multiplier = resolveServingMultiplier({
      quantity,
      grams,
      serving_grams: food.serving_grams,
    });
    macros = scaleMacros(
      {
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        fiber_g: food.fiber_g,
      },
      multiplier,
    );
  }
  return {
    id: String(row.id),
    recipe_id: String(row.recipe_id),
    food_id: String(row.food_id),
    quantity,
    grams,
    position: Math.round(num(row.position, 0)),
    note: row.note ? String(row.note) : null,
    food,
    macros,
  };
}

function rowToRecipe(row: Record<string, unknown>, favorited = false): RecipeRecord {
  return {
    id: String(row.id),
    owner_user_id: row.owner_user_id ? String(row.owner_user_id) : null,
    source: row.source === 'global' ? 'global' : 'user',
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    servings: Math.max(0.01, num(row.servings, 1)),
    prep_minutes: row.prep_minutes != null ? Math.round(num(row.prep_minutes)) : null,
    difficulty: asDifficulty(row.difficulty),
    meal_types: asMealTypes(row.meal_types),
    tags: asStringArray(row.tags),
    instructions: asInstructions(row.instructions),
    verified: Boolean(row.verified),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    favorited,
  };
}

function attachRecipeMacros(recipe: RecipeRecord, items: RecipeItemRecord[]): RecipeRecord {
  const itemMacros = items.map(
    (item) => item.macros ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
  const macros_total = sumMacros(itemMacros);
  const servings = Math.max(recipe.servings, 0.01);
  const macros_per_serving = scaleMacros(macros_total, 1 / servings);
  return {
    ...recipe,
    items,
    macros_total,
    macros_per_serving,
  };
}

export type RecipeListFilters = {
  q?: string;
  meal_type?: MealType;
  tag?: string;
  source?: 'global' | 'user' | 'all';
  favorites_only?: boolean;
  limit?: number;
};

async function loadRecipeItems(recipeId: string): Promise<RecipeItemRecord[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('nutrition_recipe_items')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('position', { ascending: true });
  throwIfMissingRelation(error, 'nutrition_recipe_items');
  if (error) throw error;
  const rows = data ?? [];
  const foodIds = [...new Set(rows.map((row) => String(row.food_id)))];
  const foods =
    foodIds.length > 0
      ? await sb.from('foods').select('*').in('id', foodIds)
      : { data: [], error: null };
  if (foods.error) throw foods.error;
  const foodMap = new Map(
    (foods.data ?? []).map((row) => [String(row.id), rowToFood(row as Record<string, unknown>)]),
  );
  return rows.map((row) =>
    rowToRecipeItem(row as Record<string, unknown>, foodMap.get(String(row.food_id)) ?? null),
  );
}

async function replaceRecipeItems(recipeId: string, items: RecipeItemInput[]): Promise<void> {
  const sb = getSupabase();
  const { error: deleteError } = await sb
    .from('nutrition_recipe_items')
    .delete()
    .eq('recipe_id', recipeId);
  if (deleteError) throw deleteError;
  if (items.length === 0) return;
  const payload = items.map((item, index) => ({
    recipe_id: recipeId,
    food_id: item.food_id,
    quantity: item.quantity != null && item.quantity > 0 ? item.quantity : 1,
    grams: item.grams != null && item.grams > 0 ? item.grams : null,
    position: item.position != null ? Math.round(item.position) : index,
    note: item.note ?? null,
  }));
  const { error } = await sb.from('nutrition_recipe_items').insert(payload);
  if (error) throw error;
}

export const Recipes = {
  async list(userId: string, filters: RecipeListFilters = {}): Promise<RecipeRecord[]> {
    const sb = getSupabase();
    const limit = Math.min(100, Math.max(1, filters.limit ?? 40));
    const { data: favRows, error: favError } = await sb
      .from('nutrition_recipe_favorites')
      .select('recipe_id')
      .eq('user_id', userId);
    throwIfMissingRelation(favError, 'nutrition_recipe_favorites');
    if (favError) throw favError;
    const favSet = new Set((favRows ?? []).map((row) => String(row.recipe_id)));

    if (filters.favorites_only) {
      if (favSet.size === 0) return [];
      const { data, error } = await sb
        .from('nutrition_recipes')
        .select('*')
        .in('id', [...favSet])
        .is('archived_at', null)
        .order('name', { ascending: true })
        .limit(limit);
      throwIfMissingRelation(error, 'nutrition_recipes');
      if (error) throw error;
      return (data ?? []).map((row) => rowToRecipe(row as Record<string, unknown>, true));
    }

    let q = sb
      .from('nutrition_recipes')
      .select('*')
      .is('archived_at', null)
      .limit(limit);

    const source = filters.source ?? 'all';
    if (source === 'global') {
      q = q.eq('source', 'global');
    } else if (source === 'user') {
      q = q.eq('source', 'user').eq('owner_user_id', userId);
    } else {
      q = q.or(`source.eq.global,owner_user_id.eq.${userId}`);
    }

    if (filters.meal_type) {
      q = q.contains('meal_types', [filters.meal_type]);
    }
    if (filters.tag) {
      q = q.contains('tags', [filters.tag]);
    }
    const query = (filters.q ?? '').trim();
    if (query) {
      q = q.ilike('name', `%${query}%`);
    } else {
      q = q.order('verified', { ascending: false }).order('name', { ascending: true });
    }

    const { data, error } = await q;
    throwIfMissingRelation(error, 'nutrition_recipes');
    if (error) throw error;
    return (data ?? []).map((row) =>
      rowToRecipe(row as Record<string, unknown>, favSet.has(String(row.id))),
    );
  },

  async getById(userId: string, id: string): Promise<RecipeRecord | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('nutrition_recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfMissingRelation(error, 'nutrition_recipes');
    if (error) throw error;
    if (!data) return null;
    const row = data as Record<string, unknown>;
    if (row.source === 'user' && String(row.owner_user_id) !== userId) return null;
    const { data: fav } = await sb
      .from('nutrition_recipe_favorites')
      .select('recipe_id')
      .eq('user_id', userId)
      .eq('recipe_id', id)
      .maybeSingle();
    const items = await loadRecipeItems(id);
    return attachRecipeMacros(rowToRecipe(row, Boolean(fav)), items);
  },

  async createUserRecipe(userId: string, input: RecipeWriteInput): Promise<RecipeRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('nutrition_recipes')
      .insert({
        owner_user_id: userId,
        source: 'user',
        name: input.name.trim(),
        description: input.description ?? null,
        servings: input.servings != null && input.servings > 0 ? input.servings : 1,
        prep_minutes: input.prep_minutes ?? null,
        difficulty: asDifficulty(input.difficulty),
        meal_types: input.meal_types ?? [],
        tags: input.tags ?? [],
        instructions: input.instructions ?? [],
        verified: false,
      })
      .select('*')
      .single();
    throwIfMissingRelation(error, 'nutrition_recipes');
    if (error) throw error;
    const recipe = rowToRecipe(data as Record<string, unknown>);
    await replaceRecipeItems(recipe.id, input.items);
    const items = await loadRecipeItems(recipe.id);
    return attachRecipeMacros(recipe, items);
  },

  async updateUserRecipe(
    userId: string,
    id: string,
    patch: Partial<RecipeWriteInput>,
  ): Promise<RecipeRecord> {
    const sb = getSupabase();
    const payload: Record<string, unknown> = {};
    if (patch.name != null) payload.name = patch.name.trim();
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.servings != null && patch.servings > 0) payload.servings = patch.servings;
    if (patch.prep_minutes !== undefined) payload.prep_minutes = patch.prep_minutes;
    if (patch.difficulty != null) payload.difficulty = asDifficulty(patch.difficulty);
    if (patch.meal_types != null) payload.meal_types = patch.meal_types;
    if (patch.tags != null) payload.tags = patch.tags;
    if (patch.instructions != null) payload.instructions = patch.instructions;

    if (Object.keys(payload).length > 0) {
      const { error } = await sb
        .from('nutrition_recipes')
        .update(payload)
        .eq('id', id)
        .eq('owner_user_id', userId)
        .eq('source', 'user');
      if (error) throw error;
    }
    if (patch.items) {
      await replaceRecipeItems(id, patch.items);
    }
    const full = await this.getById(userId, id);
    if (!full) throw new Error('Receita não encontrada.');
    return full;
  },

  async archiveUserRecipe(userId: string, id: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from('nutrition_recipes')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_user_id', userId)
      .eq('source', 'user');
    if (error) throw error;
  },

  async setFavorite(userId: string, recipeId: string, favorite: boolean): Promise<void> {
    const sb = getSupabase();
    if (favorite) {
      const { error } = await sb.from('nutrition_recipe_favorites').upsert(
        { user_id: userId, recipe_id: recipeId },
        { onConflict: 'user_id,recipe_id' },
      );
      throwIfMissingRelation(error, 'nutrition_recipe_favorites');
      if (error) throw error;
      return;
    }
    const { error } = await sb
      .from('nutrition_recipe_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);
    if (error) throw error;
  },

  /**
   * Registra todos os itens da receita como food_logs, escalados por servingsMultiplier.
   * servingsMultiplier = porções consumidas (ex.: 1 = receita inteira / servings da receita).
   * Guard anti double-tap: rejeita se já logou a mesma receita+meal+day nos últimos 2s.
   */
  async logAsMeal(
    userId: string,
    recipeId: string,
    input: {
      meal_type: MealType;
      day_key: string;
      servings?: number;
      eaten_at?: string;
      note?: string | null;
    },
  ): Promise<FoodLogRecord[]> {
    const recipe = await this.getById(userId, recipeId);
    if (!recipe || recipe.archived_at) {
      const err = new Error('Receita não encontrada.') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    const items = recipe.items ?? [];
    if (items.length === 0) {
      const err = new Error('Receita sem itens.') as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    const sb = getSupabase();
    const marker = `${RECIPE_LOG_NOTE_PREFIX}${recipeId}`;
    const since = new Date(Date.now() - RECIPE_DOUBLE_TAP_MS).toISOString();
    const { data: recent } = await sb
      .from('food_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('day_key', input.day_key)
      .eq('meal_type', input.meal_type)
      .gte('created_at', since)
      .ilike('note', `${marker}%`)
      .limit(1);
    if ((recent ?? []).length > 0) {
      const err = new Error('Receita já registrada há pouco. Aguarde um instante.') as Error & {
        status?: number;
      };
      err.status = 409;
      throw err;
    }

    const consumedServings =
      input.servings != null && Number.isFinite(input.servings) && input.servings > 0
        ? input.servings
        : 1;
    const scale = consumedServings / Math.max(recipe.servings, 0.01);
    const eatenAt = input.eaten_at ?? new Date().toISOString();
    const userNote = input.note?.trim() ? ` — ${input.note.trim()}` : '';
    const note = `${marker}${userNote}`.slice(0, 240);

    const created: FoodLogRecord[] = [];
    for (const item of items) {
      const food = item.food ?? (await Foods.get(item.food_id));
      if (!food || food.archived_at) continue;
      const baseQty = item.quantity > 0 ? item.quantity : 1;
      const quantity = baseQty * scale;
      const grams =
        item.grams != null && item.grams > 0 ? item.grams * scale : undefined;
      created.push(
        await FoodLogs.create(userId, {
          food,
          meal_type: input.meal_type,
          quantity,
          grams,
          day_key: input.day_key,
          eaten_at: eatenAt,
          note,
        }),
      );
    }
    return created;
  },
};
