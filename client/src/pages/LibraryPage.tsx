import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ExerciseCard } from '@/components/library/ExerciseCard';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { useUnlockedExercises } from '@/hooks/useUnlockedExercises';
import { useApp } from '@/hooks/useApp';
import type { MusculoPrincipal, Prioridade } from '@/types';
import { MUSCULO_LABELS, MUSCULO_HINTS, PRIORIDADE_LABELS } from '@/types';

export function LibraryPage() {
  const { exercises, muscleFilter, setMuscleFilter, ensureExercises, exercisesLoading } = useApp();
  const { unlockedCount, isUnlocked, unlock } = useUnlockedExercises();
  const [nivelFilter, setNivelFilter] = useState<number | ''>('');
  const [prioridadeFilter, setPrioridadeFilter] = useState<Prioridade | ''>('');

  useEffect(() => {
    void ensureExercises();
  }, [ensureExercises]);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (muscleFilter && ex.musculo_principal !== muscleFilter && !ex.musculos_secundarios?.includes(muscleFilter)) {
        return false;
      }
      if (nivelFilter !== '' && ex.nivel !== nivelFilter) return false;
      if (prioridadeFilter !== '' && ex.prioridade !== prioridadeFilter) return false;
      return true;
    });
  }, [exercises, muscleFilter, nivelFilter, prioridadeFilter]);

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Inventário" title="Biblioteca" />

      <div className="flex flex-wrap gap-2">
        {muscleFilter && (
          <span className="game-filter-chip">
            {MUSCULO_LABELS[muscleFilter]}
            <button type="button" onClick={() => setMuscleFilter(null)} aria-label="Remover filtro">
              <X size={12} />
            </button>
          </span>
        )}
        <select
          value={muscleFilter ?? ''}
          onChange={(e) => setMuscleFilter((e.target.value || null) as MusculoPrincipal | null)}
          className="game-select"
        >
          <option value="">Todos os músculos</option>
          {(Object.keys(MUSCULO_LABELS) as MusculoPrincipal[]).map((m) => (
            <option key={m} value={m}>{MUSCULO_LABELS[m]}</option>
          ))}
        </select>
        <select
          value={nivelFilter}
          onChange={(e) => setNivelFilter(e.target.value ? Number(e.target.value) : '')}
          className="game-select"
        >
          <option value="">Todos os níveis</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>Nível {n}</option>
          ))}
        </select>
        <select
          value={prioridadeFilter}
          onChange={(e) => setPrioridadeFilter((e.target.value || '') as Prioridade | '')}
          className="game-select"
        >
          <option value="">Todas prioridades</option>
          {(Object.keys(PRIORIDADE_LABELS) as Prioridade[]).map((p) => (
            <option key={p} value={p}>{PRIORIDADE_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {muscleFilter && (
        <p className="muscle-zone-hint -mt-2">{MUSCULO_HINTS[muscleFilter]}</p>
      )}

      <p className="text-xs font-bold text-stone-500">
        {exercisesLoading
          ? 'Carregando itens...'
          : `${filtered.length} habilidade(s) · ${unlockedCount} desbloqueada(s)`}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {exercisesLoading ? null : filtered.map((exercise) => (
          <ExerciseCard
            key={exercise.slug}
            exercise={exercise}
            unlocked={isUnlocked(exercise.slug)}
            onUnlock={unlock}
          />
        ))}
      </div>
    </div>
  );
}
