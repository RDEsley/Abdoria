import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Flame, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { ExerciseCard } from '@/components/library/ExerciseCard';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { showGameToast } from '@/lib/game-toast';
import { useUnlockedExercises } from '@/hooks/useUnlockedExercises';
import { useApp } from '@/hooks/useApp';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { playUnlock } from '@/lib/sounds';
import type { IExerciseDocument, MusculoPrincipal, Prioridade } from '@/types';
import { MUSCULO_HINTS, MUSCULO_LABELS, PRIORIDADE_LABELS, formatExerciseName } from '@/types';

export function LibraryPage() {
  const navigate = useNavigate();
  const {
    exercises,
    muscleFilter,
    setMuscleFilter,
    ensureExercises,
    exercisesLoading,
    loadRecommendations,
  } = useApp();
  const { isUnlocked, unlock, unlockAll } = useUnlockedExercises();
  const [nivelFilter, setNivelFilter] = useState<number | ''>('');
  const [prioridadeFilter, setPrioridadeFilter] = useState<Prioridade | ''>('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const refreshRecommendations = useCallback(() => {
    void loadRecommendations({ force: true });
  }, [loadRecommendations]);

  const { fixedExerciseSlugs, blockedExerciseSlugs, toggleExercisePin, toggleExerciseBlock } =
    useUserPreferences(refreshRecommendations);

  useEffect(() => {
    void ensureExercises();
  }, [ensureExercises]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (
        muscleFilter &&
        exercise.musculo_principal !== muscleFilter &&
        !exercise.musculos_secundarios?.includes(muscleFilter)
      ) {
        return false;
      }
      if (nivelFilter !== '' && exercise.nivel !== nivelFilter) return false;
      if (prioridadeFilter !== '' && exercise.prioridade !== prioridadeFilter) return false;
      if (!query) return true;
      return (
        formatExerciseName(exercise).toLowerCase().includes(query) ||
        exercise.slug.toLowerCase().includes(query)
      );
    });
  }, [exercises, muscleFilter, nivelFilter, prioridadeFilter, search]);

  const lockedInView = useMemo(
    () => filtered.filter((exercise) => !isUnlocked(exercise.slug)),
    [filtered, isUnlocked],
  );

  const secondaryFilterCount = (nivelFilter !== '' ? 1 : 0) + (prioridadeFilter !== '' ? 1 : 0);
  const hasAnyFilter = Boolean(muscleFilter) || secondaryFilterCount > 0 || search.trim() !== '';

  const clearAllFilters = useCallback(() => {
    setMuscleFilter(null);
    setNivelFilter('');
    setPrioridadeFilter('');
    setSearch('');
  }, [setMuscleFilter]);

  const handleUnlockAll = useCallback(() => {
    const slugs = lockedInView.map((exercise) => exercise.slug);
    if (slugs.length === 0) return;
    unlockAll(slugs);
    playUnlock();
    showGameToast(
      `${slugs.length} exercício${slugs.length === 1 ? '' : 's'} desbloqueado${slugs.length === 1 ? '' : 's'}!`,
      { variant: 'success' },
    );
  }, [lockedInView, unlockAll]);

  return (
    <div className="library-page flex flex-col gap-5">
      <GamePageHeader
        eyebrow="Movimentos de core"
        title="Biblioteca"
        onBack={() => navigate('/treino')}
        backIcon="x"
        backAlign="right"
      />

      <section className="library-intro" aria-label="Sobre a biblioteca">
        <span className="library-intro__icon" aria-hidden>
          <Sparkles size={19} />
        </span>
        <div>
          <strong>Treine onde estiver</strong>
          <p>Movimentos de peso corporal organizados por região e nível.</p>
        </div>
      </section>

      <div className="library-toolbar">
        <label className="library-search">
          <Search size={18} className="library-search__icon" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar movimento"
            className="library-search__input"
            aria-label="Buscar exercício"
          />
          {search && (
            <button
              type="button"
              className="library-search__clear"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </label>

        <div className="library-chips-row">
          <button
            type="button"
            className={`game-tab game-tab--scroll library-filter-btn${secondaryFilterCount > 0 ? ' game-tab--active' : ''}`}
            onClick={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={15} aria-hidden />
            Filtros
            {secondaryFilterCount > 0 && (
              <span className="library-filter-btn__badge tabular-nums">{secondaryFilterCount}</span>
            )}
          </button>

          <div className="library-muscle-tabs" role="group" aria-label="Filtrar por região">
            <button
              type="button"
              className={`game-tab game-tab--scroll${!muscleFilter ? ' game-tab--active' : ''}`}
              onClick={() => setMuscleFilter(null)}
            >
              Todos
            </button>
            {(Object.keys(MUSCULO_LABELS) as MusculoPrincipal[]).map((muscle) => (
              <button
                key={muscle}
                type="button"
                className={`game-tab game-tab--scroll${muscleFilter === muscle ? ' game-tab--active' : ''}`}
                onClick={() => setMuscleFilter(muscleFilter === muscle ? null : muscle)}
              >
                {MUSCULO_LABELS[muscle]}
              </button>
            ))}
          </div>
        </div>

        {filtersOpen && (
          <div className="library-filters-panel">
            <div className="library-filters-panel__group">
              <p className="library-filters-panel__label">
                <BarChart3 size={14} aria-hidden /> Nível
              </p>
              <div className="library-chip-row">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`game-tab game-tab--scroll${nivelFilter === level ? ' game-tab--active' : ''}`}
                    onClick={() => setNivelFilter(nivelFilter === level ? '' : level)}
                  >
                    Nível {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="library-filters-panel__group">
              <p className="library-filters-panel__label">
                <Flame size={14} aria-hidden /> Prioridade
              </p>
              <div className="library-chip-row">
                {(Object.keys(PRIORIDADE_LABELS) as Prioridade[]).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    className={`game-tab game-tab--scroll${prioridadeFilter === priority ? ' game-tab--active' : ''}`}
                    onClick={() =>
                      setPrioridadeFilter(prioridadeFilter === priority ? '' : priority)
                    }
                  >
                    {PRIORIDADE_LABELS[priority]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasAnyFilter && (
          <button type="button" className="library-clear-btn" onClick={clearAllFilters}>
            Limpar filtros
          </button>
        )}
      </div>

      {muscleFilter && <p className="muscle-zone-hint">{MUSCULO_HINTS[muscleFilter]}</p>}

      {!exercisesLoading && lockedInView.length > 0 && (
        <div className="library-unlock-row">
          <p>Há novos movimentos disponíveis nesta seleção.</p>
          <GameButton size="sm" onClick={handleUnlockAll} className="library-unlock-all-btn">
            <Sparkles size={14} aria-hidden /> Desbloquear
          </GameButton>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        {!exercisesLoading &&
          filtered.map((exercise: IExerciseDocument) => (
            <ExerciseCard
              key={exercise.slug}
              exercise={exercise}
              unlocked={isUnlocked(exercise.slug)}
              onUnlock={unlock}
              isPinned={fixedExerciseSlugs.includes(exercise.slug)}
              isBlocked={blockedExerciseSlugs.includes(exercise.slug)}
              onTogglePin={toggleExercisePin}
              onToggleBlock={toggleExerciseBlock}
            />
          ))}
      </div>

      {!exercisesLoading && filtered.length === 0 && (
        <div className="library-empty">
          <Search size={24} aria-hidden />
          <strong>Nenhum movimento encontrado</strong>
          <p>Tente remover um filtro ou buscar por outro nome.</p>
          <button type="button" onClick={clearAllFilters}>
            Limpar busca
          </button>
        </div>
      )}
    </div>
  );
}
