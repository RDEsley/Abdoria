import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { getRecipe, logRecipeAsMeal, setRecipeFavorite } from '@/lib/api/nutrition';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  type MealType,
  type RecipeRecord,
} from '@shared/nutrition';

const SERVING_OPTIONS = [0.5, 1, 1.5, 2] as const;

export function NutritionRecipeDetail({
  recipeId,
  dayKey,
  onClose,
  onLogged,
}: {
  recipeId: string | null;
  dayKey: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [recipe, setRecipe] = useState<RecipeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [servings, setServings] = useState(1);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (!recipeId) {
      setRecipe(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getRecipe(recipeId)
      .then((next) => {
        if (!cancelled) {
          setRecipe(next);
          const preferred = next.meal_types[0];
          if (preferred) setMealType(preferred);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          showGameToast(getErrorMessage(error, 'Receita indisponível.'), { variant: 'error' });
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId, onClose]);

  const logMeal = async () => {
    if (!recipe || logging) return;
    setLogging(true);
    try {
      await logRecipeAsMeal(recipe.id, {
        meal_type: mealType,
        day_key: dayKey,
        servings,
      });
      showGameToast('Receita registrada na refeição.', { variant: 'success' });
      onLogged();
      onClose();
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível registrar a receita.'), {
        variant: 'error',
      });
    } finally {
      setLogging(false);
    }
  };

  const macros = recipe?.macros_per_serving;

  return (
    <Modal
      open={Boolean(recipeId)}
      onClose={onClose}
      labelledBy="nutrition-recipe-detail-title"
      variant="wide"
    >
      <div className="nutrition-recipe-detail">
        <header className="nutrition-recipe-detail__head">
          <div>
            <h2 id="nutrition-recipe-detail-title" className="text-base font-extrabold text-stone-800">
              {loading ? 'Carregando…' : (recipe?.name ?? 'Receita')}
            </h2>
            {recipe?.description && (
              <p className="text-sm text-stone-600 mt-1">{recipe.description}</p>
            )}
          </div>
          <div className="flex gap-1">
            {recipe && (
              <button
                type="button"
                className="game-icon-btn"
                aria-label="Favoritar"
                onClick={() => {
                  void setRecipeFavorite(recipe.id, !recipe.favorited).then(() => {
                    setRecipe((prev) =>
                      prev ? { ...prev, favorited: !prev.favorited } : prev,
                    );
                  });
                }}
              >
                <Star size={16} fill={recipe.favorited ? 'currentColor' : 'none'} />
              </button>
            )}
            <button type="button" className="game-icon-btn" aria-label="Fechar" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </header>

        {macros && (
          <div className="nutrition-recipe-macros">
            <strong>{Math.round(macros.calories)} kcal</strong>
            <span>
              P {Math.round(macros.protein_g)} · C {Math.round(macros.carbs_g)} · G{' '}
              {Math.round(macros.fat_g)} / porção
            </span>
          </div>
        )}

        {recipe?.items && recipe.items.length > 0 && (
          <ul className="nutrition-recipe-ingredients">
            {recipe.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.food?.name ?? 'Alimento'} · {item.quantity}×
                </span>
                {item.macros && <small>{Math.round(item.macros.calories)} kcal</small>}
              </li>
            ))}
          </ul>
        )}

        {recipe && (
          <div className="nutrition-recipe-log mt-3 flex flex-col gap-3">
            <label className="text-sm">
              Refeição
              <select
                className="game-input mt-1 w-full"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
              >
                {MEAL_TYPE_ORDER.map((meal) => (
                  <option key={meal} value={meal}>
                    {MEAL_TYPE_LABELS[meal]}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-sm font-semibold text-stone-700 mb-2">Porções</p>
              <div className="nutrition-serving-row">
                {SERVING_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={servings === value ? 'is-on' : undefined}
                    onClick={() => setServings(value)}
                  >
                    {value}×
                  </button>
                ))}
              </div>
            </div>
            <GameButton onClick={() => void logMeal()} disabled={logging}>
              {logging ? 'Registrando…' : 'Registrar refeição'}
            </GameButton>
          </div>
        )}
      </div>
    </Modal>
  );
}
