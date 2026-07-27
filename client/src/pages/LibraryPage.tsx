import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Dumbbell,
  Flame,
  Lock,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { ExerciseCard } from '@/components/library/ExerciseCard';
import { EquipmentPanel } from '@/components/library/EquipmentPanel';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { showGameToast } from '@/components/ui/GameToast';
import { useUnlockedExercises } from '@/hooks/useUnlockedExercises';
import { useApp } from '@/hooks/useApp';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getLockedExercises } from '@/lib/api/exercises';
import { playUnlock } from '@/lib/sounds';
import type { IExerciseDocument, MusculoPrincipal, Prioridade } from '@/types';
import {
  EQUIPMENT_CATALOG,
  MUSCULO_LABELS,
  MUSCULO_HINTS,
  PRIORIDADE_LABELS,
  formatExerciseName,
} from '@/types';

export function LibraryPage() {
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
  const [lockedExercises, setLockedExercises] = useState<IExerciseDocument[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const refreshRecommendations = useCallback(() => {
    void loadRecommendations({ force: true });
  }, [loadRecommendations]);

  const { fixedExerciseSlugs, blockedExerciseSlugs, toggleExercisePin, toggleExerciseBlock } =
    useUserPreferences(refreshRecommendations);

  useEffect(() => {
    void ensureExercises();
  }, [ensureExercises]);

  // Bloqueados por equipamento aparecem com cadeado (recarrega quando o catálogo muda).
  useEffect(() => {
    let cancelled = false;
    getLockedExercises()
      .then((items) => {
        if (!cancelled) setLockedExercises(items);
      })
      .catch(() => {
        if (!cancelled) setLockedExercises([]);
      });
    return () => {
      cancelled = true;
    };
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (
        muscleFilter &&
        ex.musculo_principal !== muscleFilter &&
        !ex.musculos_secundarios?.includes(muscleFilter)
      ) {
        return false;
      }
      if (nivelFilter !== '' && ex.nivel !== nivelFilter) return false;
      if (prioridadeFilter !== '' && ex.prioridade !== prioridadeFilter) return false;
      if (q) {
        const name = formatExerciseName(ex).toLowerCase();
        if (!name.includes(q) && !ex.slug.includes(q)) return false;
      }
      return true;
    });
  }, [exercises, muscleFilter, nivelFilter, prioridadeFilter, search]);

  const filteredUnlockedCount = useMemo(
    () => filtered.filter((ex) => isUnlocked(ex.slug)).length,
    [filtered, isUnlocked],
  );

  const lockedInView = useMemo(
    () => filtered.filter((ex) => !isUnlocked(ex.slug)),
    [filtered, isUnlocked],
  );

  const secondaryFilterCount = (nivelFilter !== '' ? 1 : 0) + (prioridadeFilter !== '' ? 1 : 0);
  const hasAnyFilter =
    Boolean(muscleFilter) || secondaryFilterCount > 0 || search.trim() !== '';

  const clearAllFilters = useCallback(() => {
    setMuscleFilter(null);
    setNivelFilter('');
    setPrioridadeFilter('');
    setSearch('');
  }, [setMuscleFilter]);

  // 1 update otimista + 1 persist pro lote inteiro (ver `unlockExercises` no
  // AppContext) — chamar `unlock()` dezenas de vezes em sequência disparava N
  // requests concorrentes que podiam resolver fora de ordem e reverter itens
  // já desbloqueados. Feedback é imediato pra todo mundo (sem animação
  // escalonada por item, que não se sustentava com dezenas de exercícios).
  const handleUnlockAll = useCallback(() => {
    const slugs = lockedInView.map((ex) => ex.slug);
    if (slugs.length === 0) return;
    unlockAll(slugs);
    playUnlock();
    showGameToast(
      `${slugs.length} exercício${slugs.length === 1 ? '' : 's'} desbloqueado${slugs.length === 1 ? '' : 's'}!`,
      { variant: 'success' },
    );
  }, [lockedInView, unlockAll]);

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Inventário" title="Biblioteca" />

      <div className="library-toolbar">
        <label className="library-search">
          <Search size={16} className="library-search__icon" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar exercício..."
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
              <X size={14} />
            </button>
          )}
        </label>

        <div className="library-chips-row">
          <button
            type="button"
            className={`game-tab game-tab--scroll library-filter-btn${secondaryFilterCount > 0 ? ' game-tab--active' : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={14} aria-hidden />
            Filtros
            {secondaryFilterCount > 0 && (
              <span className="library-filter-btn__badge tabular-nums">{secondaryFilterCount}</span>
            )}
          </button>

          <div className="library-muscle-tabs" role="group" aria-label="Filtrar por músculo">
            <button
              type="button"
              className={`game-tab game-tab--scroll${!muscleFilter ? ' game-tab--active' : ''}`}
              onClick={() => setMuscleFilter(null)}
            >
              Todos
            </button>
            {(Object.keys(MUSCULO_LABELS) as MusculoPrincipal[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`game-tab game-tab--scroll${muscleFilter === m ? ' game-tab--active' : ''}`}
                onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
              >
                {MUSCULO_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {hasAnyFilter && (
          <button type="button" className="library-clear-btn" onClick={clearAllFilters}>
            Limpar filtros
          </button>
        )}

        {filtersOpen && (
          <div className="library-filters-panel">
            <div className="library-filters-panel__group">
              <p className="library-filters-panel__label">
                <BarChart3 size={13} aria-hidden /> Nível
              </p>
              <div className="library-chip-row">
                <button
                  type="button"
                  className={`game-tab game-tab--scroll${nivelFilter === '' ? ' game-tab--active' : ''}`}
                  onClick={() => setNivelFilter('')}
                >
                  Todos
                </button>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`game-tab game-tab--scroll${nivelFilter === n ? ' game-tab--active' : ''}`}
                    onClick={() => setNivelFilter(nivelFilter === n ? '' : n)}
                  >
                    Nível {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="library-filters-panel__group">
              <p className="library-filters-panel__label">
                <Flame size={13} aria-hidden /> Prioridade
              </p>
              <div className="library-chip-row">
                <button
                  type="button"
                  className={`game-tab game-tab--scroll${prioridadeFilter === '' ? ' game-tab--active' : ''}`}
                  onClick={() => setPrioridadeFilter('')}
                >
                  Todas
                </button>
                {(Object.keys(PRIORIDADE_LABELS) as Prioridade[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`game-tab game-tab--scroll${prioridadeFilter === p ? ' game-tab--active' : ''}`}
                    onClick={() => setPrioridadeFilter(prioridadeFilter === p ? '' : p)}
                  >
                    {PRIORIDADE_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {muscleFilter && <p className="muscle-zone-hint -mt-2">{MUSCULO_HINTS[muscleFilter]}</p>}

      <EquipmentPanel onEquipmentChange={refreshRecommendations} />

      <div className="flex items-center justify-between gap-2">
        {exercisesLoading ? (
          <p className="library-results-count text-xs font-bold text-stone-500">
            Carregando itens...
          </p>
        ) : (
          <p className="library-results-count">
            <span className="library-results-count__icon" aria-hidden>
              <Dumbbell size={12} />
            </span>
            <strong>{filteredUnlockedCount}</strong>
            <span className="library-results-count__slash">/{filtered.length}</span>
            <span className="library-results-count__label">desbloqueadas</span>
          </p>
        )}
        {!exercisesLoading && lockedInView.length > 0 && (
          <GameButton
            size="sm"
            onClick={handleUnlockAll}
            className="library-unlock-all-btn shrink-0"
          >
            <span className="library-unlock-all-btn__icon" aria-hidden>
              <Sparkles size={13} />
            </span>
            Desbloquear tudo
            <span className="library-unlock-all-btn__count">{lockedInView.length}</span>
          </GameButton>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {exercisesLoading
          ? null
          : filtered.map((exercise) => (
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

      {lockedExercises.length > 0 && (
        <section aria-label="Exercícios bloqueados por equipamento">
          <h3 className="game-section-title">Bloqueados por equipamento</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {lockedExercises.map((exercise) => {
              const equipmentName =
                EQUIPMENT_CATALOG.find((item) => item.id === exercise.equipamento)?.nome ??
                'equipamento';
              return (
                <div key={exercise.slug} className="library-locked-card">
                  <span className="library-locked-card__icon" aria-hidden>
                    <Lock size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="library-locked-card__name">{formatExerciseName(exercise)}</p>
                    <p className="library-locked-card__hint">
                      Requer {equipmentName} — marque em Meus Equipamentos pra liberar.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
