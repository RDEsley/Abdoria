import { foldText } from '../utils/text-fold.js';
import type { NutritionMacros } from './types.js';

export { foldText as foldFoodName };

export function roundNutrition(value: number, digits = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(Math.max(0, value) * factor) / factor;
}

export function scaleMacros(
  base: NutritionMacros,
  multiplier: number,
): NutritionMacros {
  const m = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 0;
  return {
    calories: roundNutrition(base.calories * m, 1),
    protein_g: roundNutrition(base.protein_g * m, 1),
    carbs_g: roundNutrition(base.carbs_g * m, 1),
    fat_g: roundNutrition(base.fat_g * m, 1),
    fiber_g:
      base.fiber_g == null ? null : roundNutrition(base.fiber_g * m, 1),
  };
}

/** Multiplicador a partir de porções OU gramas (quando serving_grams conhecido). */
export function resolveServingMultiplier(input: {
  quantity?: number | null;
  grams?: number | null;
  serving_grams?: number | null;
}): number {
  const servingGrams = input.serving_grams;
  if (
    input.grams != null &&
    Number.isFinite(input.grams) &&
    input.grams > 0 &&
    servingGrams != null &&
    servingGrams > 0
  ) {
    return input.grams / servingGrams;
  }
  const qty = input.quantity;
  if (qty != null && Number.isFinite(qty) && qty > 0) return qty;
  return 1;
}

export function sumMacros(items: NutritionMacros[]): NutritionMacros {
  return items.reduce<NutritionMacros>(
    (acc, item) => ({
      calories: roundNutrition(acc.calories + item.calories, 1),
      protein_g: roundNutrition(acc.protein_g + item.protein_g, 1),
      carbs_g: roundNutrition(acc.carbs_g + item.carbs_g, 1),
      fat_g: roundNutrition(acc.fat_g + item.fat_g, 1),
      fiber_g: roundNutrition((acc.fiber_g ?? 0) + (item.fiber_g ?? 0), 1),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
}

export function validateFoodMacros(input: {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  serving_grams?: number | null;
}): string | null {
  const name = input.name.trim();
  if (!name) return 'Nome obrigatório.';
  if (name.length > 80) return 'Nome muito longo.';
  for (const [label, value] of [
    ['Calorias', input.calories],
    ['Proteínas', input.protein_g],
    ['Carboidratos', input.carbs_g],
    ['Gorduras', input.fat_g],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) return `${label} inválidas.`;
    if (value > 5000) return `${label} fora do limite razoável.`;
  }
  if (input.fiber_g != null && (!Number.isFinite(input.fiber_g) || input.fiber_g < 0)) {
    return 'Fibra inválida.';
  }
  if (
    input.serving_grams != null &&
    (!Number.isFinite(input.serving_grams) || input.serving_grams <= 0 || input.serving_grams > 5000)
  ) {
    return 'Porção em gramas inválida.';
  }
  return null;
}
