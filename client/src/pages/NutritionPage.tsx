import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import {
  deleteFoodLog,
  getNutritionDay,
  getNutritionProfile,
  listRecipes,
} from '@/lib/api/nutrition';
import type { MealType, NutritionProfile, RecipeRecord } from '@shared/nutrition';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { NutritionSetupWizard } from '@/features/nutrition/NutritionSetupWizard';
import { NutritionToday } from '@/features/nutrition/NutritionToday';
import { NutritionRecipes } from '@/features/nutrition/NutritionRecipes';
import { NutritionRecipeDetail } from '@/features/nutrition/NutritionRecipeDetail';
import { NutritionProgress } from '@/features/nutrition/NutritionProgress';
import { NutritionFoodPicker } from '@/features/nutrition/NutritionFoodPicker';
import { NutritionSkeleton } from '@/features/nutrition/NutritionSkeleton';
import { isMealTypeParam } from '@/features/nutrition/nutrition-utils';

type TabId = 'hoje' | 'receitas' | 'progresso';

type DayPayload = Awaited<ReturnType<typeof getNutritionDay>>;

export function NutritionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = getTodaySaoPaulo();

  const [tab, setTab] = useState<TabId>('hoje');
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [day, setDay] = useState<DayPayload | null>(null);
  const [recipeSuggestion, setRecipeSuggestion] = useState<RecipeRecord | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wizardMode, setWizardMode] = useState<'first' | 'edit' | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [weightOpen, setWeightOpen] = useState(false);
  const [recipeId, setRecipeId] = useState<string | null>(null);

  const hasLoadedOnceRef = useRef(false);
  const deepLinkHandled = useRef(false);

  const setupComplete = Boolean(profile?.setup_completed_at);

  const reload = useCallback(async () => {
    const isInitial = !hasLoadedOnceRef.current;
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    try {
      const nextProfile = await getNutritionProfile();
      setProfile(nextProfile);
      if (!nextProfile?.setup_completed_at) {
        setWizardMode((current) => current ?? 'first');
        setDay(null);
        return;
      }
      const [nextDay, recipes] = await Promise.all([
        getNutritionDay(today),
        listRecipes().catch(() => [] as RecipeRecord[]),
      ]);
      setDay(nextDay);
      setRecipeSuggestion(recipes[0] ?? null);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível carregar a alimentação.'), {
        variant: 'error',
      });
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!setupComplete || deepLinkHandled.current) return;
    const acao = searchParams.get('acao');
    const refeicao = searchParams.get('refeicao');
    if (acao === 'registrar') {
      deepLinkHandled.current = true;
      setTab('hoje');
      if (isMealTypeParam(refeicao)) setMealType(refeicao);
      setPickerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('acao');
      next.delete('refeicao');
      setSearchParams(next, { replace: true });
    }
  }, [setupComplete, searchParams, setSearchParams]);

  const openMeal = (meal: MealType) => {
    setMealType(meal);
    setPickerOpen(true);
  };

  const removeLog = async (id: string) => {
    try {
      await deleteFoodLog(id);
      await reload();
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível remover.'), { variant: 'error' });
    }
  };

  if (initialLoading) {
    return (
      <div className="nutrition-page flex flex-col gap-4 pb-24">
        <GamePageHeader title="Alimentação" />
        <NutritionSkeleton />
      </div>
    );
  }

  if (!setupComplete || wizardMode === 'first') {
    return (
      <div className="nutrition-page flex flex-col gap-4 pb-24">
        <GamePageHeader title="Alimentação" />
        <NutritionSetupWizard
          open
          mode="first"
          profile={profile}
          onClose={() => navigate('/')}
          onCompleted={(next) => {
            setProfile(next);
            setWizardMode(null);
            void reload();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="nutrition-page flex flex-col gap-4 pb-24"
      aria-busy={initialLoading || refreshing || undefined}
    >
      <GamePageHeader title="Alimentação" />

      <div className="nutrition-tabs" role="tablist" aria-label="Áreas de alimentação">
        {(
          [
            ['hoje', 'Hoje'],
            ['receitas', 'Receitas'],
            ['progresso', 'Progresso'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'is-on' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {initialLoading && <NutritionSkeleton />}

      {!initialLoading && setupComplete && tab === 'hoje' && (
        <NutritionToday
          profile={profile}
          day={day}
          recipeSuggestion={recipeSuggestion}
          onOpenMeal={openMeal}
          onRemoveLog={(id) => void removeLog(id)}
          onOpenWeight={() => setWeightOpen(true)}
          onOpenPlan={() => setWizardMode('edit')}
          onOpenRecipe={setRecipeId}
        />
      )}

      {!initialLoading && setupComplete && tab === 'receitas' && (
        <NutritionRecipes onOpenRecipe={setRecipeId} />
      )}

      {!initialLoading && setupComplete && (
        <NutritionProgress
          weightOpen={weightOpen}
          onWeightOpenChange={setWeightOpen}
          showContent={tab === 'progresso'}
        />
      )}

      <NutritionFoodPicker
        open={pickerOpen && setupComplete}
        dayKey={today}
        mealType={mealType}
        onMealTypeChange={setMealType}
        onClose={() => setPickerOpen(false)}
        onLogged={() => void reload()}
      />

      <NutritionRecipeDetail
        recipeId={setupComplete ? recipeId : null}
        dayKey={today}
        onClose={() => setRecipeId(null)}
        onLogged={() => void reload()}
      />

      {wizardMode === 'edit' && (
        <NutritionSetupWizard
          open
          mode="edit"
          profile={profile}
          onClose={() => setWizardMode(null)}
          onCompleted={(next) => {
            setProfile(next);
            setWizardMode(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}
