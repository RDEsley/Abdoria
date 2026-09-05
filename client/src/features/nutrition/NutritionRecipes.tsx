import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import {
  createUserRecipe,
  listRecipes,
  searchFoods,
  setRecipeFavorite,
} from '@/lib/api/nutrition';
import type { FoodRecord, MealType, RecipeRecord } from '@shared/nutrition';

type RecipeFilter =
  | 'all'
  | 'rapidas'
  | 'cafe'
  | 'almoco'
  | 'lanches'
  | 'vegetariana'
  | 'favoritas'
  | 'minhas';

const FILTERS: Array<{ id: RecipeFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'rapidas', label: 'Rápidas' },
  { id: 'cafe', label: 'Café' },
  { id: 'almoco', label: 'Almoço/Jantar' },
  { id: 'lanches', label: 'Lanches' },
  { id: 'vegetariana', label: 'Vegetariana' },
  { id: 'favoritas', label: 'Favoritas' },
  { id: 'minhas', label: 'Minhas' },
];

function matchesFilter(recipe: RecipeRecord, filter: RecipeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'rapidas') {
    return (
      recipe.tags.includes('rapido') ||
      (recipe.prep_minutes != null && recipe.prep_minutes <= 20)
    );
  }
  if (filter === 'cafe') return recipe.meal_types.includes('breakfast');
  if (filter === 'almoco') {
    return recipe.meal_types.includes('lunch') || recipe.meal_types.includes('dinner');
  }
  if (filter === 'lanches') {
    return recipe.meal_types.includes('snack') || recipe.meal_types.includes('supper');
  }
  if (filter === 'vegetariana') {
    return recipe.tags.includes('vegetariano') || recipe.tags.includes('vegano');
  }
  if (filter === 'favoritas') return Boolean(recipe.favorited);
  if (filter === 'minhas') return recipe.source === 'user';
  return true;
}

export function NutritionRecipes({
  onOpenRecipe,
}: {
  onOpenRecipe: (id: string) => void;
}) {
  const [filter, setFilter] = useState<RecipeFilter>('all');
  const [recipes, setRecipes] = useState<RecipeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [foodQuery, setFoodQuery] = useState('');
  const [foodResults, setFoodResults] = useState<FoodRecord[]>([]);
  const [items, setItems] = useState<Array<{ food: FoodRecord; quantity: number }>>([]);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const params =
        filter === 'favoritas'
          ? { favorites: true as const }
          : filter === 'minhas'
            ? { source: 'user' as const }
            : filter === 'cafe'
              ? { meal_type: 'breakfast' as MealType }
              : filter === 'lanches'
                ? { meal_type: 'snack' as MealType }
                : filter === 'vegetariana'
                  ? { tag: 'vegetariano' }
                  : filter === 'rapidas'
                    ? { tag: 'rapido' }
                    : undefined;
      const list = await listRecipes(params);
      setRecipes(list.filter((recipe) => matchesFilter(recipe, filter)));
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível carregar receitas.'), {
        variant: 'error',
      });
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (!createOpen || !foodQuery.trim()) {
      setFoodResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchFoods(foodQuery)
        .then(setFoodResults)
        .catch(() => setFoodResults([]));
    }, 220);
    return () => window.clearTimeout(handle);
  }, [createOpen, foodQuery]);

  const saveRecipe = async () => {
    if (!name.trim()) {
      showGameToast('Informe o nome da receita.', { variant: 'warn' });
      return;
    }
    if (items.length === 0) {
      showGameToast('Adicione ao menos um alimento.', { variant: 'warn' });
      return;
    }
    setSaving(true);
    try {
      const created = await createUserRecipe({
        name: name.trim(),
        servings: 1,
        items: items.map((item, index) => ({
          food_id: item.food.id,
          quantity: item.quantity,
          position: index,
        })),
      });
      setCreateOpen(false);
      setName('');
      setItems([]);
      setFoodQuery('');
      showGameToast('Receita criada.', { variant: 'success' });
      onOpenRecipe(created.id);
      void reload();
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível criar a receita.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nutrition-recipes flex flex-col gap-3">
      <div className="nutrition-filter-row" role="tablist" aria-label="Filtros de receitas">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={filter === item.id ? 'is-on' : undefined}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-stone-500">Carregando receitas…</p>}

      {!loading && recipes.length === 0 && (
        <section className="nutrition-empty">
          <p>Nenhuma receita neste filtro.</p>
        </section>
      )}

      <ul className="nutrition-recipe-list">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <button
              type="button"
              className="nutrition-recipe-card"
              onClick={() => onOpenRecipe(recipe.id)}
            >
              <span>
                <strong>{recipe.name}</strong>
                <small>
                  {recipe.prep_minutes != null ? `${recipe.prep_minutes} min · ` : ''}
                  {recipe.macros_per_serving
                    ? `${Math.round(recipe.macros_per_serving.calories)} kcal/porção`
                    : recipe.source === 'user'
                      ? 'Sua receita'
                      : 'Receita Evolyn'}
                </small>
              </span>
              <button
                type="button"
                aria-label="Favoritar"
                onClick={(event) => {
                  event.stopPropagation();
                  void setRecipeFavorite(recipe.id, !recipe.favorited).then(() => {
                    setRecipes((prev) =>
                      prev.map((item) =>
                        item.id === recipe.id
                          ? { ...item, favorited: !recipe.favorited }
                          : item,
                      ),
                    );
                  });
                }}
              >
                <Star size={14} fill={recipe.favorited ? 'currentColor' : 'none'} />
              </button>
            </button>
          </li>
        ))}
      </ul>

      <GameButton variant="secondary" onClick={() => setCreateOpen(true)}>
        Criar receita
      </GameButton>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        labelledBy="nutrition-create-recipe-title"
        variant="wide"
      >
        <h2 id="nutrition-create-recipe-title" className="text-base font-extrabold text-stone-800">
          Nova receita
        </h2>
        <label className="mt-3 block text-sm">
          Nome
          <input
            className="game-input mt-1 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Bowl de aveia"
          />
        </label>
        <label className="mt-3 block text-sm">
          Buscar alimento
          <input
            className="game-input mt-1 w-full"
            value={foodQuery}
            onChange={(e) => setFoodQuery(e.target.value)}
            placeholder="Digite para adicionar"
          />
        </label>
        {foodResults.length > 0 && (
          <div className="nutrition-food-list">
            {foodResults.slice(0, 8).map((food) => (
              <button
                key={food.id}
                type="button"
                className="nutrition-food-row"
                onClick={() => {
                  setItems((prev) =>
                    prev.some((item) => item.food.id === food.id)
                      ? prev
                      : [...prev, { food, quantity: 1 }],
                  );
                  setFoodQuery('');
                  setFoodResults([]);
                }}
              >
                <span>
                  <strong>{food.name}</strong>
                  <small>{Math.round(food.calories)} kcal</small>
                </span>
              </button>
            ))}
          </div>
        )}
        {items.length > 0 && (
          <ul className="nutrition-recipe-ingredients">
            {items.map((item) => (
              <li key={item.food.id}>
                <span>
                  {item.food.name} · {item.quantity}×
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((row) => row.food.id !== item.food.id))
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <GameButton
            variant="ghost"
            className="!w-auto px-4"
            onClick={() => setCreateOpen(false)}
            disabled={saving}
          >
            Cancelar
          </GameButton>
          <GameButton
            className="!w-auto px-5"
            onClick={() => void saveRecipe()}
            disabled={saving}
          >
            Salvar
          </GameButton>
        </div>
      </Modal>
    </div>
  );
}
