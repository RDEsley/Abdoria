import { ExerciseGuideSheet } from '@/components/exercises/ExerciseGuideSheet';
import type { IExerciseDocument } from '@/types';

interface Props {
  exercise: IExerciseDocument;
  onClose: () => void;
}

/** @deprecated Nome mantido para compatibilidade; agora abre o guia educacional completo. */
export function ExerciseVideoModal({ exercise, onClose }: Props) {
  return <ExerciseGuideSheet exercise={exercise} open onClose={onClose} />;
}
