export type NutritionGoal = 'maintain' | 'gain' | 'lose' | 'track';
export type NutritionTargetMode = 'none' | 'manual' | 'estimated';
export type FoodSource = 'global' | 'user';
export type RecipeSource = FoodSource;
export type RecipeDifficulty = 'easy' | 'medium' | 'hard';
export type DietStyle = 'omnivore' | 'vegetarian' | 'vegan' | 'lactose_free';
export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'supper' | 'other';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  snack: 'Lanche',
  dinner: 'Jantar',
  supper: 'Ceia',
  other: 'Outro',
};

export const MEAL_TYPE_ORDER: MealType[] = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
  'supper',
  'other',
];

export interface NutritionMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
}

export interface NutritionProfile {
  user_id: string;
  goal: NutritionGoal;
  target_mode: NutritionTargetMode;
  calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  activity_factor: number | null;
  setup_completed_at: string | null;
  preferences: NutritionPreferences;
  created_at: string;
  updated_at: string;
}

export interface NutritionMealReminder {
  meal_type: MealType | 'custom';
  label: string;
  time: string;
  weekdays: number[];
  enabled: boolean;
  /** ID no preferencias.lembretes_personalizados */
  reminder_id?: string;
}

export interface NutritionPreferences {
  /** Preferência agregada; booleanos abaixo permanecem para compatibilidade. */
  diet_style?: DietStyle;
  vegetarian?: boolean;
  vegan?: boolean;
  lactose_free?: boolean;
  avoid_foods?: string[];
  meal_reminders?: NutritionMealReminder[];
  allergies_note?: string;
}

export interface FoodRecord {
  id: string;
  owner_user_id: string | null;
  source: FoodSource;
  name: string;
  brand: string | null;
  serving_description: string;
  serving_grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
  name_fold: string;
  verified: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  favorited?: boolean;
}

export interface FoodLogRecord {
  id: string;
  user_id: string;
  food_id: string | null;
  food_name_snapshot: string;
  serving_description_snapshot: string;
  serving_grams_snapshot: number | null;
  meal_type: MealType;
  quantity: number;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  eaten_at: string;
  day_key: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeightLogRecord {
  id: string;
  user_id: string;
  weight_kg: number;
  day_key: string;
  recorded_at: string;
  note: string | null;
  created_at: string;
}

export interface DayNutritionSummary {
  day_key: string;
  totals: NutritionMacros;
  targets: {
    calorie_target: number | null;
    protein_target_g: number | null;
    carbs_target_g: number | null;
    fat_target_g: number | null;
    target_mode: NutritionTargetMode;
  };
  meals: Array<{
    meal_type: MealType;
    totals: NutritionMacros;
    logs: FoodLogRecord[];
  }>;
  log_count: number;
}

export interface RecipeItemRecord {
  id: string;
  recipe_id: string;
  food_id: string;
  quantity: number;
  grams: number | null;
  position: number;
  note: string | null;
  food?: FoodRecord | null;
  /** Macros do item (já escalados por quantity/grams da receita). */
  macros?: NutritionMacros;
}

export interface RecipeRecord {
  id: string;
  owner_user_id: string | null;
  source: RecipeSource;
  name: string;
  description: string | null;
  servings: number;
  prep_minutes: number | null;
  difficulty: RecipeDifficulty;
  meal_types: MealType[];
  tags: string[];
  instructions: string[];
  verified: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  favorited?: boolean;
  items?: RecipeItemRecord[];
  /** Totais da receita completa (soma dos itens). */
  macros_total?: NutritionMacros;
  /** Macros por porção (totais / servings). */
  macros_per_serving?: NutritionMacros;
}

export interface RecipeItemInput {
  food_id: string;
  quantity?: number;
  grams?: number | null;
  position?: number;
  note?: string | null;
}

export interface RecipeWriteInput {
  name: string;
  description?: string | null;
  servings?: number;
  prep_minutes?: number | null;
  difficulty?: RecipeDifficulty;
  meal_types?: MealType[];
  tags?: string[];
  instructions?: string[];
  items: RecipeItemInput[];
}

export const FOOD_NAME_MAX = 80;
export const FOOD_BRAND_MAX = 60;
export const FOOD_NOTE_MAX = 240;
export const USER_FOODS_MAX = 200;
export const FOOD_SEARCH_LIMIT = 40;
export const RECIPE_NAME_MAX = 100;
export const RECIPE_DESC_MAX = 400;
export const RECIPE_NOTE_MAX = 240;
export const USER_RECIPES_MAX = 100;
export const RECIPE_SEARCH_LIMIT = 40;
export const RECIPE_DIFFICULTIES: RecipeDifficulty[] = ['easy', 'medium', 'hard'];
export const DIET_STYLES: DietStyle[] = ['omnivore', 'vegetarian', 'vegan', 'lactose_free'];
