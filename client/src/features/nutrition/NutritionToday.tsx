import { Plus, Scale } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import {
  MEAL_TYPE_LABELS,
  type DayNutritionSummary,
  type MealType,
  type NutritionProfile,
  type RecipeRecord,
} from '@shared/nutrition';
import { NutritionDaySummary } from './NutritionDaySummary';
import { NutritionMealTimeline } from './NutritionMealTimeline';
import { findNextMeal, enabledMealReminders } from './nutrition-utils';

type DayPayload = DayNutritionSummary & {
  suggestions: Array<{ kind: string; message: string; hint?: string }>;
};

export function NutritionToday({
  profile,
  day,
  recipeSuggestion,
  onOpenMeal,
  onRemoveLog,
  onOpenWeight,
  onOpenPlan,
  onOpenRecipe,
}: {
  profile: NutritionProfile | null;
  day: DayPayload | null;
  recipeSuggestion: RecipeRecord | null;
  onOpenMeal: (meal: MealType) => void;
  onRemoveLog: (id: string) => void;
  onOpenWeight: () => void;
  onOpenPlan: () => void;
  onOpenRecipe: (id: string) => void;
}) {
  const nextMeal = findNextMeal(enabledMealReminders(profile));
  const tip = day?.suggestions?.[0] ?? null;

  return (
    <div className="nutrition-today flex flex-col gap-3">
      <NutritionDaySummary day={day} />

      {nextMeal && (
        <section className="nutrition-next-meal">
          <p className="nutrition-next-meal__kicker">Próxima refeição</p>
          <div className="nutrition-next-meal__row">
            <div>
              <strong>
                {nextMeal.label ||
                  MEAL_TYPE_LABELS[
                    nextMeal.meal_type === 'custom' ? 'other' : nextMeal.meal_type
                  ]}
              </strong>
              <small>{nextMeal.time}</small>
            </div>
            <GameButton
              size="sm"
              className="!w-auto px-3"
              onClick={() =>
                onOpenMeal(
                  (nextMeal.meal_type === 'custom' ? 'other' : nextMeal.meal_type) as MealType,
                )
              }
            >
              Registrar
            </GameButton>
          </div>
        </section>
      )}

      <NutritionMealTimeline
        profile={profile}
        day={day}
        onOpenMeal={onOpenMeal}
        onRemoveLog={onRemoveLog}
      />

      {tip && (
        <section className="nutrition-tips">
          <h3>Sugestão do dia</h3>
          <p>
            {tip.message}
            {tip.hint ? ` · ${tip.hint}` : ''}
          </p>
        </section>
      )}

      {recipeSuggestion && (
        <button
          type="button"
          className="nutrition-recipe-suggest"
          onClick={() => onOpenRecipe(recipeSuggestion.id)}
        >
          <span>
            <strong>Ideia de receita</strong>
            <small>{recipeSuggestion.name}</small>
          </span>
          <span aria-hidden>→</span>
        </button>
      )}

      {(day?.log_count ?? 0) === 0 && (
        <section className="nutrition-empty">
          <p>Seu dia começa por aqui.</p>
          <p>Registre sua primeira refeição quando quiser.</p>
        </section>
      )}

      <div className="nutrition-actions">
        <GameButton
          className="flex items-center justify-center gap-2"
          onClick={() => onOpenMeal('lunch')}
        >
          <Plus size={16} /> Adicionar alimento
        </GameButton>
        <GameButton
          variant="secondary"
          className="flex items-center justify-center gap-2"
          onClick={onOpenWeight}
        >
          <Scale size={16} /> Registrar peso
        </GameButton>
        <button type="button" className="nutrition-plan-link" onClick={onOpenPlan}>
          Plano alimentar
        </button>
      </div>
    </div>
  );
}
