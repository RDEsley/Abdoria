import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Search, X } from 'lucide-react';
import { ExerciseCard } from '@/components/library/ExerciseCard';
import { EquipmentPanel } from '@/components/library/EquipmentPanel';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { useUnlockedExercises } from '@/hooks/useUnlockedExercises';
import { useApp } from '@/hooks/useApp';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getLockedExercises } from '@/lib/api/exercises';
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
  const { isUnlocked, unlock } = useUnlockedExercises();
  const [nivelFilter, setNivelFilter] = useState<number | ''>('');
  const [prioridadeFilter, setPrioridadeFilter] = useState<Prioridade | ''>('');
  const [search, setSearch] = useState('');
  const [lockedExercises, setLockedExercises] = useState<IExerciseDocument[]>([]);

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

        <div className="library-filters">
          <select
            value={muscleFilter ?? ''}
            onChange={(e) => setMuscleFilter((e.target.value || null) as MusculoPrincipal | null)}
            className="game-select library-filters__select"
            aria-label="Filtrar por músculo"
          >
            <option value="">Todos os músculos</option>
            {(Object.keys(MUSCULO_LABELS) as MusculoPrincipal[]).map((m) => (
              <option key={m} value={m}>
                {MUSCULO_LABELS[m]}
              </option>
            ))}
          </select>
          <select
            value={nivelFilter}
            onChange={(e) => setNivelFilter(e.target.value ? Number(e.target.value) : '')}
            className="game-select library-filters__select"
            aria-label="Filtrar por nível"
          >
            <option value="">Todos os níveis</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Nível {n}
              </option>
            ))}
          </select>
          <select
            value={prioridadeFilter}
            onChange={(e) => setPrioridadeFilter((e.target.value || '') as Prioridade | '')}
            className="game-select library-filters__select"
            aria-label="Filtrar por prioridade"
          >
            <option value="">Todas prioridades</option>
            {(Object.keys(PRIORIDADE_LABELS) as Prioridade[]).map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {muscleFilter && <p className="muscle-zone-hint -mt-2">{MUSCULO_HINTS[muscleFilter]}</p>}

      <EquipmentPanel onEquipmentChange={refreshRecommendations} />

      <p className="text-xs font-bold text-stone-500">
        {exercisesLoading
          ? 'Carregando itens...'
          : `${filtered.length} habilidade(s) · ${filteredUnlockedCount} desbloqueada(s)`}
      </p>

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
