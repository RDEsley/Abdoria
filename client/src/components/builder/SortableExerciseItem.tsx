import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Play, Settings2, X } from 'lucide-react';
import { ExerciseVideoModal } from '@/components/library/ExerciseVideoModal';
import { exerciseMediaUrl } from '@/lib/media';
import type { IExerciseDocument, WorkoutQueueItem } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';
import { MuscleTag } from '@/components/builder/MuscleTag';

interface Props {
  id: string;
  item: WorkoutQueueItem;
  index: number;
  exercise?: IExerciseDocument;
  onRemove?: () => void;
  onConfigure?: () => void;
}

export function SortableExerciseItem({ id, item, index, exercise, onRemove, onConfigure }: Props) {
  const [showVideo, setShowVideo] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className={`workout-queue-item${isDragging ? ' is-dragging' : ''}`}
      >
        <div className="workout-queue-item__main">
          <div className="workout-queue-item__media">
            <img
              src={exerciseMediaUrl(item.slug)}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => event.currentTarget.classList.add('is-missing')}
            />
            <span>{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="workout-queue-item__copy">
            <p>{formatExerciseName(item)}</p>
            <strong>{formatExercisePrescription(item)}</strong>
            <MuscleTag muscle={item.musculo_principal} compact />
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="workout-queue-item__remove"
              aria-label="Remover exercício"
            >
              <X size={16} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className="workout-queue-item__drag"
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
          >
            <GripVertical size={19} aria-hidden />
          </button>
        </div>

        <div className="workout-queue-item__actions">
          {exercise && (
            <button type="button" onClick={() => setShowVideo(true)}>
              <Play size={15} aria-hidden /> Ver treino
            </button>
          )}
          {onConfigure && (
            <button type="button" onClick={onConfigure}>
              <Settings2 size={14} aria-hidden /> Configurar
            </button>
          )}
        </div>
      </li>

      {showVideo && exercise && (
        <ExerciseVideoModal exercise={exercise} onClose={() => setShowVideo(false)} />
      )}
    </>
  );
}
