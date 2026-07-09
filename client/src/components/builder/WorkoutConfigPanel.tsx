import { ChevronDown, Settings2 } from 'lucide-react';
import { WheelNumberPicker } from '@/components/ui/WheelNumberPicker';
import type { ModoExercicio, StoredRepScheme, WorkoutQueueItem } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';

interface Props {
  open: boolean;
  onToggle: () => void;
  queue: WorkoutQueueItem[];
  sortableIds: string[];
  globalDescanso: number;
  onChangeGlobalDescanso: (seconds: number) => void;
  schemes: StoredRepScheme[];
  selectedSchemeId: string | null;
  customizedIndices: Set<number>;
  onApplySchemeToItem: (scheme: StoredRepScheme, index: number) => void;
  onUpdateItem: (index: number, patch: Partial<WorkoutQueueItem>) => void;
}

/** Disclosure de configuração do treino: descanso padrão e séries/repetições por exercício. */
export function WorkoutConfigPanel({
  open,
  onToggle,
  queue,
  sortableIds,
  globalDescanso,
  onChangeGlobalDescanso,
  schemes,
  selectedSchemeId,
  customizedIndices,
  onApplySchemeToItem,
  onUpdateItem,
}: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`game-disclosure ${open ? 'game-disclosure--open' : ''}`}
        aria-expanded={open}
        aria-controls="workout-config-panel"
      >
        <span className="game-disclosure__icon" aria-hidden>
          <Settings2 size={18} />
        </span>
        <span className="game-disclosure__body">
          <span className="game-disclosure__title">Configurar descanso, séries e repetições</span>
          <span className="game-disclosure__hint">
            {open ? 'Toque para recolher' : 'Toque para ajustar descanso, séries e repetições'}
          </span>
        </span>
        <ChevronDown size={20} className="game-disclosure__chevron" aria-hidden />
      </button>

      {open &&
        (queue.length === 0 ? (
          <div className="glass-card game-disclosure-panel rounded-2xl p-4">
            <p className="text-sm text-stone-500">Adicione ou recomende exercícios para ajustar.</p>
          </div>
        ) : (
          <div
            id="workout-config-panel"
            className="glass-card game-disclosure-panel rounded-2xl p-4"
          >
            <WheelNumberPicker
              label="Descanso padrão"
              value={globalDescanso}
              min={10}
              max={90}
              suffix="s"
              onChange={onChangeGlobalDescanso}
            />
            {queue.map((item, idx) => (
              <div key={sortableIds[idx]} className="mt-3 border-t border-stone-100 pt-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold">{formatExerciseName(item)}</span>
                    <p className="text-[0.65rem] font-bold text-stone-500">
                      {formatExercisePrescription(item)}
                    </p>
                  </div>
                  {item.modo === 'reps' && (
                    <div className="flex flex-wrap gap-1">
                      {schemes.map((scheme) => (
                        <button
                          key={`${item.slug}-${scheme.id}`}
                          type="button"
                          onClick={() => onApplySchemeToItem(scheme, idx)}
                          className={`rounded-md border px-2 py-0.5 text-[0.6rem] font-extrabold ${
                            selectedSchemeId === scheme.id && !customizedIndices.has(idx)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-400'
                          }`}
                        >
                          {scheme.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <WheelNumberPicker
                    label="Séries"
                    value={item.series}
                    min={1}
                    max={10}
                    onChange={(series) => onUpdateItem(idx, { series })}
                  />
                  <WheelNumberPicker
                    label="Repetições"
                    value={item.repeticoes ?? 12}
                    min={1}
                    max={50}
                    disabled={item.modo === 'tempo'}
                    placeholder="Por tempo"
                    onChange={(repeticoes) =>
                      onUpdateItem(idx, { repeticoes, modo: 'reps' as ModoExercicio })
                    }
                  />
                  <WheelNumberPicker
                    label="Descanso (s)"
                    value={item.descanso_seg ?? globalDescanso}
                    min={5}
                    max={90}
                    suffix="s"
                    onChange={(descanso_seg) => onUpdateItem(idx, { descanso_seg })}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
    </>
  );
}
