import type { NutritionGoal, NutritionTargetMode } from './types.js';
import type { SexoBiologico } from '../types/index.js';

export interface EstimateTargetsInput {
  goal: NutritionGoal;
  sexo?: SexoBiologico | null;
  idade?: number | null;
  peso_kg?: number | null;
  altura_cm?: number | null;
  /** Fator de atividade (1.2–1.9). Default sedentário leve se ausente. */
  activity_factor?: number | null;
}

export interface EstimatedTargets {
  target_mode: Extract<NutritionTargetMode, 'estimated'>;
  calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  activity_factor: number;
  bmr: number;
  tdee: number;
  missing: string[];
}

/** Mifflin–St Jeor + ajustes conservadores. Wellness — não é prescrição clínica. */
export function estimateNutritionTargets(input: EstimateTargetsInput): EstimatedTargets | null {
  const missing: string[] = [];
  if (input.peso_kg == null || !Number.isFinite(input.peso_kg) || input.peso_kg < 30) {
    missing.push('peso');
  }
  if (input.altura_cm == null || !Number.isFinite(input.altura_cm) || input.altura_cm < 120) {
    missing.push('altura');
  }
  if (input.idade == null || !Number.isFinite(input.idade) || input.idade < 14) {
    missing.push('idade');
  }
  if (!input.sexo) missing.push('sexo');
  if (missing.length > 0 || input.goal === 'track') return null;

  const peso = Number(input.peso_kg);
  const altura = Number(input.altura_cm);
  const idade = Number(input.idade);
  const sexo = input.sexo!;
  const activity =
    input.activity_factor && input.activity_factor >= 1.2 && input.activity_factor <= 1.9
      ? input.activity_factor
      : 1.375;

  const bmr =
    sexo === 'masculino'
      ? 10 * peso + 6.25 * altura - 5 * idade + 5
      : 10 * peso + 6.25 * altura - 5 * idade - 161;
  const tdee = bmr * activity;

  let calories = tdee;
  if (input.goal === 'lose') calories = tdee - 300;
  if (input.goal === 'gain') calories = tdee + 250;
  // Conservador: não abaixo de ~22 kcal/kg nem acima de ~40 kcal/kg.
  const minCal = Math.max(1400, Math.round(peso * 22));
  const maxCal = Math.round(peso * 40);
  calories = Math.min(maxCal, Math.max(minCal, Math.round(calories / 10) * 10));

  const protein = Math.round(peso * (input.goal === 'gain' ? 1.8 : 1.6));
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    target_mode: 'estimated',
    calorie_target: calories,
    protein_target_g: protein,
    carbs_target_g: carbs,
    fat_target_g: fat,
    activity_factor: activity,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    missing: [],
  };
}

export function balanceSuggestions(input: {
  remaining: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  vegetarian?: boolean;
  vegan?: boolean;
}): Array<{ kind: 'protein' | 'carbs' | 'fat' | 'ok'; message: string; hint?: string }> {
  const out: Array<{ kind: 'protein' | 'carbs' | 'fat' | 'ok'; message: string; hint?: string }> = [];
  const { remaining } = input;
  if (remaining.calories <= 150 && remaining.protein_g <= 15) {
    out.push({ kind: 'ok', message: 'Seu dia está perto da referência.' });
    return out;
  }
  if (remaining.protein_g >= 25) {
    out.push({
      kind: 'protein',
      message: 'Proteína ainda abaixo da referência.',
      hint: input.vegan
        ? 'Lentilha, feijão ou whey vegetal'
        : input.vegetarian
          ? 'Ovos, iogurte ou queijo cottage'
          : 'Frango, ovos ou iogurte grego',
    });
  }
  if (remaining.carbs_g >= 40 && out.length < 3) {
    out.push({
      kind: 'carbs',
      message: 'Carboidratos ainda abertos no dia.',
      hint: 'Arroz, batata-doce, aveia ou fruta',
    });
  }
  if (remaining.fat_g >= 20 && out.length < 3) {
    out.push({
      kind: 'fat',
      message: 'Gorduras ainda abaixo da referência.',
      hint: 'Abacate, azeite ou amendoim (porção pequena)',
    });
  }
  return out.slice(0, 3);
}
