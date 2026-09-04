import { describe, expect, it } from 'vitest';
import {
  balanceSuggestions,
  estimateNutritionTargets,
  resolveServingMultiplier,
  scaleMacros,
  sumMacros,
  validateFoodMacros,
} from '../../shared/nutrition/index.js';
import { foldText } from '../../shared/utils/text-fold.js';

describe('nutrition macros', () => {
  const base = { calories: 100, protein_g: 10, carbs_g: 20, fat_g: 5, fiber_g: 2 };

  it('escala 0.5 / 1 / 1.5 / 2 porções', () => {
    expect(scaleMacros(base, 0.5).calories).toBe(50);
    expect(scaleMacros(base, 1).protein_g).toBe(10);
    expect(scaleMacros(base, 1.5).carbs_g).toBe(30);
    expect(scaleMacros(base, 2).fat_g).toBe(10);
  });

  it('escala por gramas quando serving_grams conhecido', () => {
    const m = resolveServingMultiplier({ grams: 50, serving_grams: 100 });
    expect(m).toBe(0.5);
    expect(scaleMacros(base, m).calories).toBe(50);
  });

  it('soma refeição/dia sem NaN/negativo', () => {
    const total = sumMacros([scaleMacros(base, 1), scaleMacros(base, 0.5)]);
    expect(total.calories).toBe(150);
    expect(total.protein_g).toBe(15);
    expect(Object.values(total).every((v) => v == null || (Number.isFinite(v) && v >= 0))).toBe(
      true,
    );
  });

  it('valida macros', () => {
    expect(validateFoodMacros({ name: '', calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 })).toBeTruthy();
    expect(
      validateFoodMacros({ name: 'Ovo', calories: -1, protein_g: 0, carbs_g: 0, fat_g: 0 }),
    ).toBeTruthy();
    expect(
      validateFoodMacros({ name: 'Ovo', calories: 74, protein_g: 6, carbs_g: 1, fat_g: 5 }),
    ).toBeNull();
  });

  it('busca fold sem acento', () => {
    expect(foldText('Feijão').includes('feijao')).toBe(true);
  });
});

describe('nutrition targets', () => {
  it('estima manutenção com dados completos', () => {
    const result = estimateNutritionTargets({
      goal: 'maintain',
      sexo: 'masculino',
      idade: 30,
      peso_kg: 75,
      altura_cm: 175,
      activity_factor: 1.375,
    });
    expect(result).not.toBeNull();
    expect(result!.calorie_target).toBeGreaterThan(1500);
    expect(result!.protein_target_g).toBeGreaterThan(50);
  });

  it('perda usa déficit conservador', () => {
    const maintain = estimateNutritionTargets({
      goal: 'maintain',
      sexo: 'feminino',
      idade: 28,
      peso_kg: 65,
      altura_cm: 165,
    })!;
    const lose = estimateNutritionTargets({
      goal: 'lose',
      sexo: 'feminino',
      idade: 28,
      peso_kg: 65,
      altura_cm: 165,
    })!;
    expect(lose.calorie_target).toBeLessThan(maintain.calorie_target);
    expect(maintain.calorie_target - lose.calorie_target).toBeLessThanOrEqual(400);
  });

  it('sem dados não estima', () => {
    expect(estimateNutritionTargets({ goal: 'maintain' })).toBeNull();
    expect(estimateNutritionTargets({ goal: 'track', peso_kg: 70, altura_cm: 170, idade: 25, sexo: 'masculino' })).toBeNull();
  });
});

describe('balance suggestions', () => {
  it('sugere proteína quando falta', () => {
    const tips = balanceSuggestions({
      remaining: { calories: 400, protein_g: 40, carbs_g: 10, fat_g: 5 },
    });
    expect(tips.some((t) => t.kind === 'protein')).toBe(true);
    expect(tips.length).toBeLessThanOrEqual(3);
  });
});
