export type {
  DayNutritionSummary,
  FoodLogRecord,
  FoodRecord,
  FoodSource,
  MealType,
  NutritionGoal,
  NutritionMacros,
  NutritionMealReminder,
  NutritionPreferences,
  NutritionProfile,
  NutritionTargetMode,
  WeightLogRecord,
} from './types.js';
export {
  FOOD_BRAND_MAX,
  FOOD_NAME_MAX,
  FOOD_NOTE_MAX,
  FOOD_SEARCH_LIMIT,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  USER_FOODS_MAX,
} from './types.js';
export {
  foldFoodName,
  resolveServingMultiplier,
  roundNutrition,
  scaleMacros,
  sumMacros,
  validateFoodMacros,
} from './macros.js';
export { balanceSuggestions, estimateNutritionTargets } from './targets.js';
