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
  type NutritionPreferences,
  type NutritionProfile,
  type WeightLogRecord,
} from '../../../shared/nutrition/index.js';
import { throwIfMissingRelation } from '../utils/schema-errors.js';

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
