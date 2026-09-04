import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Scale, Search, Star } from 'lucide-react';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import {
  createFoodLog,
  createUserFood,
  deleteFoodLog,
  getNutritionDay,
  getNutritionProfile,
  getWeightLogs,
  listFavoriteFoods,
  listRecentFoods,
  saveWeightLog,
  searchFoods,
  setFoodFavorite,
  upsertNutritionProfile,
} from '@/lib/api/nutrition';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  type FoodRecord,
  type MealType,
  type NutritionProfile,
} from '@shared/nutrition';
import { getTodaySaoPaulo, addDaysSaoPaulo } from '@shared/utils/timezone';
import { useAuth } from '@/hooks/useAuth';

type TabId = 'hoje' | 'historico' | 'progresso';

export function NutritionPage() {
  const { user, refreshUser } = useAuth();
  const today = getTodaySaoPaulo();
  const [tab, setTab] = useState<TabId>('hoje');
  const [dayKey, setDayKey] = useState(today);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [day, setDay] = useState<Awaited<ReturnType<typeof getNutritionDay>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRecord[]>([]);
  const [recent, setRecent] = useState<FoodRecord[]>([]);
  const [favorites, setFavorites] = useState<FoodRecord[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<FoodRecord | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [quantity, setQuantity] = useState(1);
  const [setupOpen, setSetupOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightValue, setWeightValue] = useState(String(user?.peso_kg ?? ''));
  const [weightDays, setWeightDays] = useState(30);
  const [weightSeries, setWeightSeries] = useState<
    Awaited<ReturnType<typeof getWeightLogs>> | null
  >(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: '',
    serving_description: 'porção',
    serving_grams: '100',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
  });

  const reloadDay = useCallback(async (key = dayKey) => {
    const [nextProfile, nextDay] = await Promise.all([
      getNutritionProfile(),
      getNutritionDay(key),
    ]);
    setProfile(nextProfile);
    setDay(nextDay);
    if (!nextProfile?.setup_completed_at) setSetupOpen(true);
  }, [dayKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void reloadDay(dayKey)
      .catch((error) => {
        showGameToast(getErrorMessage(error, 'Não foi possível carregar a alimentação.'), {
          variant: 'error',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dayKey, reloadDay]);

  useEffect(() => {
    if (!pickerOpen) return;
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
  }, [pickerOpen, query]);

  useEffect(() => {
    if (tab !== 'progresso') return;
    void getWeightLogs(weightDays)
      .then(setWeightSeries)
      .catch(() => setWeightSeries(null));
  }, [tab, weightDays]);

  const caloriePct = useMemo(() => {
    const target = day?.targets.calorie_target;
    if (!target || target <= 0) return null;
    return Math.min(100, Math.round(((day?.totals.calories ?? 0) / target) * 100));
  }, [day]);

  const openAdd = () => {
    setQuery('');
    setSelected(null);
    setQuantity(1);
    setPickerOpen(true);
  };

  const confirmLog = async () => {
    if (!selected) return;
    try {
      await createFoodLog({
        food_id: selected.id,
        meal_type: mealType,
        quantity,
        day_key: dayKey,
      });
      showGameToast('Alimento registrado.', { variant: 'success' });
      setSelected(null);
      setPickerOpen(false);
      await reloadDay(dayKey);
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível registrar.'), { variant: 'error' });
    }
  };

  const removeLog = async (id: string) => {
    try {
      await deleteFoodLog(id);
      await reloadDay(dayKey);
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível remover.'), { variant: 'error' });
    }
  };

  const finishSetup = async (mode: 'skip' | 'manual' | 'estimated') => {
    try {
      if (mode === 'skip') {
        await upsertNutritionProfile({
          goal: 'track',
          target_mode: 'none',
          setup_completed: true,
        });
      } else if (mode === 'estimated') {
        await upsertNutritionProfile({
          goal: 'maintain',
          target_mode: 'estimated',
          reestimate: true,
          setup_completed: true,
        });
      } else {
        await upsertNutritionProfile({
          goal: 'maintain',
          target_mode: 'manual',
          calorie_target: 2000,
          protein_target_g: 120,
          carbs_target_g: 220,
          fat_target_g: 65,
          setup_completed: true,
        });
      }
      setSetupOpen(false);
      await reloadDay(dayKey);
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível salvar o setup.'), {
        variant: 'error',
      });
    }
  };

  const saveWeight = async () => {
    const value = Number(weightValue.replace(',', '.'));
    if (!Number.isFinite(value)) {
      showGameToast('Informe um peso válido.', { variant: 'warn' });
      return;
    }
    try {
      await saveWeightLog({ weight_kg: value, day_key: today });
      showGameToast('Peso registrado.', { variant: 'success' });
      setWeightOpen(false);
      await refreshUser();
      if (tab === 'progresso') setWeightSeries(await getWeightLogs(weightDays));
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível salvar o peso.'), {
        variant: 'error',
      });
    }
  };

  const saveCustomFood = async () => {
    try {
      const created = await createUserFood({
        name: customFood.name,
        serving_description: customFood.serving_description,
        serving_grams: Number(customFood.serving_grams) || null,
        calories: Number(customFood.calories),
        protein_g: Number(customFood.protein_g),
        carbs_g: Number(customFood.carbs_g),
        fat_g: Number(customFood.fat_g),
      });
      setCreateOpen(false);
      setSelected(created);
      setPickerOpen(true);
      showGameToast('Alimento criado.', { variant: 'success' });
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível criar o alimento.'), {
        variant: 'error',
      });
    }
  };

  const browseList = query.trim() ? results : [...favorites, ...recent.filter((r) => !favorites.some((f) => f.id === r.id))];

  return (
    <div className="nutrition-page flex flex-col gap-4 pb-24">
      <GamePageHeader title="Alimentação" />

      <div className="nutrition-tabs" role="tablist" aria-label="Áreas de alimentação">
        {(
          [
            ['hoje', 'Hoje'],
            ['historico', 'Histórico'],
            ['progresso', 'Progresso'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'is-on' : undefined}
            onClick={() => {
              setTab(id);
              if (id === 'hoje') setDayKey(today);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm font-medium text-stone-500">Carregando…</p>}

      {!loading && (tab === 'hoje' || tab === 'historico') && (
        <>
          {tab === 'historico' && (
            <div className="nutrition-day-nav">
              <button
                type="button"
                onClick={() => setDayKey(addDaysSaoPaulo(dayKey, -1))}
              >
                ←
              </button>
              <strong>{dayKey === today ? 'Hoje' : dayKey}</strong>
              <button
                type="button"
                disabled={dayKey >= today}
                onClick={() => setDayKey(addDaysSaoPaulo(dayKey, 1))}
              >
                →
              </button>
            </div>
          )}

          <section className="nutrition-summary">
            <div className="nutrition-summary__calories">
              <strong>{Math.round(day?.totals.calories ?? 0)}</strong>
              <span>
                {day?.targets.calorie_target
                  ? `de ${day.targets.calorie_target} kcal · referência ${
                      day.targets.target_mode === 'estimated' ? 'estimada' : 'manual'
                    }`
                  : 'kcal hoje · sem meta'}
              </span>
              {caloriePct != null && (
                <div className="nutrition-bar" aria-hidden>
                  <i style={{ width: `${caloriePct}%` }} />
                </div>
              )}
            </div>
            <div className="nutrition-macros">
              {(
                [
                  ['P', day?.totals.protein_g, day?.targets.protein_target_g],
                  ['C', day?.totals.carbs_g, day?.targets.carbs_target_g],
                  ['G', day?.totals.fat_g, day?.targets.fat_target_g],
                ] as const
              ).map(([label, value, target]) => (
                <div key={label}>
                  <strong>
                    {label} {Math.round(value ?? 0)}g
                  </strong>
                  <small>{target != null ? `meta ${Math.round(target)}g` : '—'}</small>
                </div>
              ))}
            </div>
          </section>

          {(day?.suggestions?.length ?? 0) > 0 && (
            <section className="nutrition-tips">
              <h3>Para equilibrar o dia</h3>
              {day!.suggestions.map((tip) => (
                <p key={tip.message}>
                  {tip.message}
                  {tip.hint ? ` · ${tip.hint}` : ''}
                </p>
              ))}
            </section>
          )}

          {(day?.log_count ?? 0) === 0 ? (
            <section className="nutrition-empty">
              <p>Seu dia começa por aqui.</p>
              <p>Registre sua primeira refeição quando quiser.</p>
            </section>
          ) : (
            <div className="flex flex-col gap-3">
              {MEAL_TYPE_ORDER.map((meal) => {
                const block = day?.meals.find((entry) => entry.meal_type === meal);
                if (!block) return null;
                return (
                  <section key={meal} className="nutrition-meal">
                    <header>
                      <h3>{MEAL_TYPE_LABELS[meal]}</h3>
                      <span>{Math.round(block.totals.calories)} kcal</span>
                    </header>
                    <ul>
                      {block.logs.map((log) => (
                        <li key={log.id}>
                          <div>
                            <strong>{log.food_name_snapshot}</strong>
                            <small>
                              {log.quantity}× · {Math.round(log.calories)} kcal
                            </small>
                          </div>
                          <button type="button" onClick={() => void removeLog(log.id)}>
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          <div className="nutrition-actions">
            <GameButton className="flex items-center justify-center gap-2" onClick={openAdd}>
              <Plus size={16} /> Adicionar alimento
            </GameButton>
            <GameButton
              variant="secondary"
              className="flex items-center justify-center gap-2"
              onClick={() => setWeightOpen(true)}
            >
              <Scale size={16} /> Registrar peso
            </GameButton>
          </div>
        </>
      )}

      {!loading && tab === 'progresso' && (
        <section className="nutrition-progress">
          <div className="nutrition-day-nav">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                className={weightDays === days ? 'is-on' : undefined}
                onClick={() => setWeightDays(days)}
              >
                {days}d
              </button>
            ))}
          </div>
          <p className="text-sm text-stone-600">
            Último peso:{' '}
            <strong>
              {weightSeries?.latest
                ? `${weightSeries.latest.weight_kg.toFixed(1)} kg`
                : 'ainda não registrado'}
            </strong>
          </p>
          {(weightSeries?.logs.length ?? 0) < 2 ? (
            <p className="nutrition-empty">Registre peso em mais dias para ver a tendência.</p>
          ) : (
            <WeightSparkline logs={weightSeries!.logs} />
          )}
          <GameButton variant="secondary" onClick={() => setWeightOpen(true)}>
            Registrar peso
          </GameButton>
          {profile && (
            <p className="text-xs text-stone-500">
              Metas são referência de bem-estar — não substituem orientação profissional.
            </p>
          )}
        </section>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} labelledBy="food-picker-title">
        <h2 id="food-picker-title" className="text-base font-extrabold text-stone-800">
          {selected ? 'Confirmar' : 'Buscar alimento'}
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
                    aria-label="Favoritar"
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
                onChange={(e) => setMealType(e.target.value as MealType)}
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
              <GameButton variant="ghost" className="!w-auto px-4" onClick={() => setSelected(null)}>
                Voltar
              </GameButton>
              <GameButton className="!w-auto px-5" onClick={() => void confirmLog()}>
                Registrar
              </GameButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} labelledBy="nutrition-setup-title">
        <h2 id="nutrition-setup-title" className="text-base font-extrabold text-stone-800">
          Como quer acompanhar?
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Estimativas são referência de bem-estar — não são orientação clínica.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <GameButton onClick={() => void finishSetup('estimated')}>Meta estimada</GameButton>
          <GameButton variant="secondary" onClick={() => void finishSetup('manual')}>
            Meta manual (2000 kcal)
          </GameButton>
          <GameButton variant="ghost" onClick={() => void finishSetup('skip')}>
            Pular e começar sem meta
          </GameButton>
        </div>
      </Modal>

      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} labelledBy="weight-title">
        <h2 id="weight-title" className="text-base font-extrabold text-stone-800">
          Registrar peso
        </h2>
        <input
          className="game-input mt-3 w-full"
          inputMode="decimal"
          value={weightValue}
          onChange={(e) => setWeightValue(e.target.value)}
          placeholder="kg"
        />
        <div className="mt-4 flex justify-end gap-2">
          <GameButton variant="ghost" className="!w-auto px-4" onClick={() => setWeightOpen(false)}>
            Cancelar
          </GameButton>
          <GameButton className="!w-auto px-5" onClick={() => void saveWeight()}>
            Salvar
          </GameButton>
        </div>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} labelledBy="create-food-title">
        <h2 id="create-food-title" className="text-base font-extrabold text-stone-800">
          Novo alimento
        </h2>
        <div className="mt-3 grid gap-2">
          {(
            [
              ['name', 'Nome'],
              ['serving_description', 'Porção'],
              ['serving_grams', 'Gramas'],
              ['calories', 'kcal'],
              ['protein_g', 'Proteína (g)'],
              ['carbs_g', 'Carbo (g)'],
              ['fat_g', 'Gordura (g)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              <input
                className="game-input mt-1 w-full"
                value={customFood[key]}
                onChange={(e) => setCustomFood((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <GameButton variant="ghost" className="!w-auto px-4" onClick={() => setCreateOpen(false)}>
            Cancelar
          </GameButton>
          <GameButton className="!w-auto px-5" onClick={() => void saveCustomFood()}>
            Criar
          </GameButton>
        </div>
      </Modal>
    </div>
  );
}

function WeightSparkline({
  logs,
}: {
  logs: Array<{ day_key: string; weight_kg: number }>;
}) {
  const width = 320;
  const height = 120;
  const pad = 12;
  const values = logs.map((log) => log.weight_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.1, max - min);
  const points = values
    .map((value, index) => {
      const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');
  const delta = values[values.length - 1]! - values[0]!;
  return (
    <div className="nutrition-spark">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendência de peso">
        <polyline fill="none" stroke="#0a9875" strokeWidth="2.5" points={points} />
      </svg>
      <p className="text-xs text-stone-500">
        Tendência no período: {delta >= 0 ? '+' : ''}
        {delta.toFixed(1)} kg (variação bruta, não interpretação de gordura).
      </p>
    </div>
  );
}
