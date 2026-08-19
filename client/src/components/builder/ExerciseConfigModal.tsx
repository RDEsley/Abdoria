import { Ban, Pin, Settings2, Shuffle, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { WheelNumberPicker } from '@/components/ui/WheelNumberPicker';
import type { ModoExercicio, StoredRepScheme, WorkoutQueueItem } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';

interface Props {
  item: WorkoutQueueItem | null;
  index: number | null;
  defaultRestSeconds: number;
  schemes: StoredRepScheme[];
  isPinned: boolean;
  isBlocked: boolean;
  onClose: () => void;
  onSwap: () => void;
  onTogglePin: () => void;
  onToggleBlock: () => void;
  onApplyScheme: (scheme: StoredRepScheme, index: number) => void;
  onUpdate: (index: number, patch: Partial<WorkoutQueueItem>) => void;
}

/** Ajustes completos de um único exercício, abertos a partir da própria fila. */
export function ExerciseConfigModal({
  item,
  index,
  defaultRestSeconds,
  schemes,
  isPinned,
  isBlocked,
  onClose,
  onSwap,
  onTogglePin,
  onToggleBlock,
  onApplyScheme,
  onUpdate,
}: Props) {
  if (!item || index === null) return null;

  return (
    <Modal open onClose={onClose} labelledBy="exercise-config-title" panelClassName="!max-w-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="game-page-header__eyebrow flex items-center gap-1.5">
            <Settings2 size={14} aria-hidden /> Configurar exercício
          </p>
          <h2 id="exercise-config-title" className="text-lg font-extrabold text-stone-900">
            {formatExerciseName(item)}
          </h2>
          <p className="mt-1 text-xs font-bold text-stone-500">
            {formatExercisePrescription(item)}
          </p>
        </div>
        <button type="button" className="game-icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={17} aria-hidden />
        </button>
      </div>

      {item.modo === 'reps' && schemes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-stone-500">
            Esquemas rápidos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {schemes.slice(0, 6).map((scheme) => (
              <GameButton
                key={scheme.id}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onApplyScheme(scheme, index)}
              >
                {scheme.label}
              </GameButton>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <WheelNumberPicker
          label="Séries"
          value={item.series}
          min={1}
          max={10}
          onChange={(series) => onUpdate(index, { series })}
        />
        {item.modo === 'tempo' ? (
          <WheelNumberPicker
            label="Duração"
            value={item.tempo_seg ?? item.tempo_recomendado ?? 30}
            min={10}
            max={600}
            step={5}
            suffix="s"
            onChange={(tempo_seg) => onUpdate(index, { tempo_seg })}
          />
        ) : (
          <WheelNumberPicker
            label="Repetições"
            value={item.repeticoes ?? 12}
            min={1}
            max={50}
            onChange={(repeticoes) =>
              onUpdate(index, { repeticoes, modo: 'reps' as ModoExercicio })
            }
          />
        )}
        <WheelNumberPicker
          label="Descanso"
          value={item.descanso_seg ?? defaultRestSeconds}
          min={5}
          max={90}
          suffix="s"
          onChange={(descanso_seg) => onUpdate(index, { descanso_seg })}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <GameButton
          type="button"
          variant="secondary"
          size="sm"
          className="flex items-center justify-center gap-1.5"
          onClick={onSwap}
        >
          <Shuffle size={14} aria-hidden /> Trocar
        </GameButton>
        <GameButton
          type="button"
          variant={isPinned ? 'secondary' : 'ghost'}
          size="sm"
          className="flex items-center justify-center gap-1.5"
          aria-pressed={isPinned}
          onClick={onTogglePin}
        >
          <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} aria-hidden /> Fixar
        </GameButton>
        <GameButton
          type="button"
          variant={isBlocked ? 'danger' : 'ghost'}
          size="sm"
          className="flex items-center justify-center gap-1.5"
          aria-pressed={isBlocked}
          onClick={onToggleBlock}
        >
          <Ban size={14} aria-hidden /> Bloquear
        </GameButton>
      </div>
    </Modal>
  );
}
