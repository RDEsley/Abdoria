import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { IExerciseDocument } from '@/types';
import { formatExerciseName } from '@/types';
import { GameButton } from '@/components/ui/GameButton';
import { MuscleTag } from '@/components/builder/MuscleTag';

interface Props {
  exercises: IExerciseDocument[];
  loading?: boolean;
  onAdd: (slug: string) => void;
}

export function ExercisePicker({ exercises, loading, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((ex) => {
      const name = formatExerciseName(ex).toLowerCase();
      return name.includes(q) || ex.slug.includes(q);
    });
  }, [exercises, query]);

  const handleAdd = () => {
    if (!selectedSlug) return;
    onAdd(selectedSlug);
    setSelectedSlug('');
    setQuery('');
  };

  return (
    <div id="builder-add-exercise" className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na biblioteca de exercícios..."
          className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-stone-800 placeholder:text-stone-400"
          aria-label="Buscar exercício"
        />
      </div>

      <div className="max-h-52 overflow-y-auto rounded-xl border border-stone-200 bg-white">
        {loading ? (
          <p className="p-3 text-sm text-stone-500">Carregando exercícios...</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-sm text-stone-500">Nenhum exercício encontrado.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtered.map((ex) => {
              const isSelected = selectedSlug === ex.slug;
              return (
                <li key={ex.slug}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(isSelected ? '' : ex.slug)}
                    className={[
                      'flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors',
                      isSelected ? 'bg-emerald-50' : 'hover:bg-stone-50',
                    ].join(' ')}
                    aria-pressed={isSelected}
                  >
                    <span className="min-w-0 truncate text-sm font-bold text-stone-900">
                      {formatExerciseName(ex)}
                    </span>
                    <MuscleTag muscle={ex.musculo_principal} compact />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <GameButton variant="secondary" className="w-full" onClick={handleAdd} disabled={!selectedSlug}>
        Adicionar ao treino
      </GameButton>
    </div>
  );
}
