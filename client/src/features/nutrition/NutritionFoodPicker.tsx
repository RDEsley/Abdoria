import { useEffect, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import {
  createFoodLog,
  listFavoriteFoods,
  listRecentFoods,
  searchFoods,
  setFoodFavorite,
} from '@/lib/api/nutrition';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  type FoodRecord,
  type MealType,
} from '@shared/nutrition';
import { NutritionFoodEditor } from './NutritionFoodEditor';

export function NutritionFoodPicker({
  open,
  dayKey,
  mealType,
  onMealTypeChange,
  onClose,
  onLogged,
}: {
  open: boolean;
  dayKey: string;
  mealType: MealType;
  onMealTypeChange: (meal: MealType) => void;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRecord[]>([]);
  const [recent, setRecent] = useState<FoodRecord[]>([]);
  const [favorites, setFavorites] = useState<FoodRecord[]>([]);
  const [selected, setSelected] = useState<FoodRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [logging, setLogging] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(null);
      setQuantity(1);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          if (!query.trim()) {
            const [r, f] = await Promise.all([listRecentFoods(), listFavoriteFoods()]);
            setRecent(r);
            setFavorites(f);
            setResults([]);
            return;
          }
          setResults(await searchFoods(query));
        } catch (error) {
          showGameToast(getErrorMessage(error, 'Busca indisponível.'), { variant: 'error' });
        }
      })();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const browseList = query.trim()
    ? results
    : [
        ...favorites,
        ...recent.filter((item) => !favorites.some((fav) => fav.id === item.id)),
      ];

  const confirmLog = async () => {
    if (!selected || logging) return;
    setLogging(true);
    try {
      await createFoodLog({
        food_id: selected.id,
        meal_type: mealType,
        quantity,
        day_key: dayKey,
      });
      showGameToast('Alimento registrado.', { variant: 'success' });
      setSelected(null);
      onClose();
      onLogged();
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível registrar.'), { variant: 'error' });
    } finally {
      setLogging(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} labelledBy="nutrition-food-picker-title" variant="wide">
        <h2 id="nutrition-food-picker-title" className="text-base font-extrabold text-stone-800">
          {selected ? 'Confirmar' : 'Adicionar alimento'}
        </h2>

        {!selected ? (
          <>
            <label className="nutrition-search mt-3">
              <Search size={15} aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: arroz, ovo, banana"
                autoComplete="off"
              />
            </label>

            {!query.trim() && favorites.length > 0 && (
              <p className="nutrition-picker-caption">Favoritos</p>
            )}
            {!query.trim() && favorites.length === 0 && recent.length > 0 && (
              <p className="nutrition-picker-caption">Recentes</p>
            )}
            {query.trim() && <p className="nutrition-picker-caption">Catálogo</p>}

            <div className="nutrition-food-list">
              {browseList.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  className="nutrition-food-row"
                  onClick={() => setSelected(food)}
                >
                  <span>
                    <strong>{food.name}</strong>
                    <small>
                      {food.serving_description} · {Math.round(food.calories)} kcal · P
                      {Math.round(food.protein_g)}/C{Math.round(food.carbs_g)}/G
                      {Math.round(food.fat_g)}
                    </small>
                  </span>
                  <button
                    type="button"
                    aria-label={food.favorited ? 'Remover favorito' : 'Favoritar'}
                    onClick={(event) => {
                      event.stopPropagation();
                      void setFoodFavorite(food.id, !food.favorited).then(() => {
                        setFavorites((prev) =>
                          food.favorited
                            ? prev.filter((item) => item.id !== food.id)
                            : [{ ...food, favorited: true }, ...prev],
                        );
                      });
                    }}
                  >
                    <Star size={14} fill={food.favorited ? 'currentColor' : 'none'} />
                  </button>
                </button>
              ))}
              {browseList.length === 0 && (
                <p className="nutrition-empty-inline">Nenhum alimento por aqui ainda.</p>
              )}
            </div>
            <GameButton variant="ghost" className="mt-2" onClick={() => setCreateOpen(true)}>
              Criar alimento próprio
            </GameButton>
          </>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm font-semibold text-stone-700">{selected.name}</p>
            <label className="text-sm">
              Refeição
              <select
                className="game-input mt-1 w-full"
                value={mealType}
                onChange={(e) => onMealTypeChange(e.target.value as MealType)}
              >
                {MEAL_TYPE_ORDER.map((meal) => (
                  <option key={meal} value={meal}>
                    {MEAL_TYPE_LABELS[meal]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Porções
              <input
                className="game-input mt-1 w-full"
                type="number"
                min={0.5}
                step={0.5}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <div className="flex justify-end gap-2">
              <GameButton
                variant="ghost"
                className="!w-auto px-4"
                onClick={() => setSelected(null)}
                disabled={logging}
              >
                Voltar
              </GameButton>
              <GameButton
                className="!w-auto px-5"
                onClick={() => void confirmLog()}
                disabled={logging}
              >
                {logging ? 'Registrando…' : 'Registrar'}
              </GameButton>
            </div>
          </div>
        )}
      </Modal>

      <NutritionFoodEditor
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(food) => {
          setCreateOpen(false);
          setSelected(food);
        }}
      />
    </>
  );
}
