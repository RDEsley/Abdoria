import { fetchJson } from './client';
import type {
  DayNutritionSummary,
  FoodLogRecord,
  FoodRecord,
  MealType,
  NutritionProfile,
  RecipeRecord,
  WeightLogRecord,
} from '@shared/nutrition';

export function getNutritionProfile(): Promise<NutritionProfile | null> {
  return fetchJson('/nutrition/profile');
}

export function upsertNutritionProfile(
  body: Record<string, unknown>,
): Promise<NutritionProfile> {
  return fetchJson('/nutrition/profile', { method: 'PUT', body: JSON.stringify(body) });
}

export function searchFoods(query: string): Promise<FoodRecord[]> {
  return fetchJson(`/nutrition/foods?q=${encodeURIComponent(query)}`);
}

export function listRecentFoods(): Promise<FoodRecord[]> {
  return fetchJson('/nutrition/foods?mode=recent');
}

export function listFavoriteFoods(): Promise<FoodRecord[]> {
  return fetchJson('/nutrition/foods?mode=favorites');
}

export function createUserFood(body: Record<string, unknown>): Promise<FoodRecord> {
  return fetchJson('/nutrition/foods', { method: 'POST', body: JSON.stringify(body) });
}

export function setFoodFavorite(id: string, favorite: boolean): Promise<{ ok: boolean }> {
  return fetchJson(`/nutrition/foods/${id}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ favorite }),
  });
}

export function getNutritionDay(day?: string): Promise<
  DayNutritionSummary & {
    suggestions: Array<{ kind: string; message: string; hint?: string }>;
  }
> {
  const suffix = day ? `?day=${encodeURIComponent(day)}` : '';
  return fetchJson(`/nutrition/day${suffix}`);
}

export function createFoodLog(body: {
  food_id: string;
  meal_type: MealType;
  quantity?: number;
  grams?: number;
  day_key?: string;
  note?: string;
}): Promise<FoodLogRecord> {
  return fetchJson('/nutrition/logs', { method: 'POST', body: JSON.stringify(body) });
}

export function updateFoodLog(
  id: string,
  body: Record<string, unknown>,
): Promise<FoodLogRecord> {
  return fetchJson(`/nutrition/logs/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteFoodLog(id: string): Promise<{ ok: boolean }> {
  return fetchJson(`/nutrition/logs/${id}`, { method: 'DELETE' });
}

export function repeatMeal(body: {
  from_day: string;
  to_day?: string;
  meal_type: MealType;
}): Promise<FoodLogRecord[]> {
  return fetchJson('/nutrition/logs/repeat-meal', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getWeightLogs(days = 30): Promise<{
  from: string;
  to: string;
  logs: WeightLogRecord[];
  latest: WeightLogRecord | null;
}> {
  return fetchJson(`/nutrition/weight?days=${days}`);
}

export function getNutritionStats(days = 30): Promise<{
  from: string;
  to: string;
  days: number;
  days_with_logs: number;
}> {
  return fetchJson(`/nutrition/stats?days=${days}`);
}

export function saveWeightLog(body: {
  weight_kg: number;
  day_key?: string;
  note?: string;
}): Promise<WeightLogRecord> {
  return fetchJson('/nutrition/weight', { method: 'POST', body: JSON.stringify(body) });
}

export function listRecipes(params?: {
  q?: string;
  meal_type?: MealType;
  tag?: string;
  source?: 'global' | 'user' | 'all';
  favorites?: boolean;
}): Promise<RecipeRecord[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.meal_type) search.set('meal_type', params.meal_type);
  if (params?.tag) search.set('tag', params.tag);
  if (params?.source) search.set('source', params.source);
  if (params?.favorites) search.set('favorites', '1');
  const qs = search.toString();
  return fetchJson(`/nutrition/recipes${qs ? `?${qs}` : ''}`);
}

export function getRecipe(id: string): Promise<RecipeRecord> {
  return fetchJson(`/nutrition/recipes/${id}`);
}

export function createUserRecipe(body: Record<string, unknown>): Promise<RecipeRecord> {
  return fetchJson('/nutrition/recipes', { method: 'POST', body: JSON.stringify(body) });
}

export function updateUserRecipe(
  id: string,
  body: Record<string, unknown>,
): Promise<RecipeRecord> {
  return fetchJson(`/nutrition/recipes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function archiveUserRecipe(id: string): Promise<{ ok: boolean }> {
  return fetchJson(`/nutrition/recipes/${id}`, { method: 'DELETE' });
}

export function setRecipeFavorite(
  id: string,
  favorite: boolean,
): Promise<{ ok: boolean; favorite: boolean }> {
  return fetchJson(`/nutrition/recipes/${id}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ favorite }),
  });
}

export function logRecipeAsMeal(
  id: string,
  body: {
    meal_type: MealType;
    day_key?: string;
    servings?: number;
    eaten_at?: string;
    note?: string;
  },
): Promise<FoodLogRecord[]> {
  return fetchJson(`/nutrition/recipes/${id}/log`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
