import { useCallback } from 'react';
import { useApp } from '@/hooks/useApp';

export function useUnlockedExercises() {
  const { unlockedExercises, unlockExercise } = useApp();

  const unlock = useCallback(
    (slug: string) => {
      unlockExercise(slug);
    },
    [unlockExercise],
  );

  const isUnlocked = useCallback((slug: string) => unlockedExercises.has(slug), [unlockedExercises]);

  return {
    unlocked: unlockedExercises,
    unlock,
    isUnlocked,
    unlockedCount: unlockedExercises.size,
  };
}
