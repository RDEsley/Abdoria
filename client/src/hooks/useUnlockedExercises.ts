import { useCallback } from 'react';
import { useApp } from '@/hooks/useApp';

export function useUnlockedExercises() {
  const { unlockedExercises, unlockExercise, unlockExercises: unlockManySlugs } = useApp();

  const unlock = useCallback(
    (slug: string) => {
      unlockExercise(slug);
    },
    [unlockExercise],
  );

  /** Desbloqueia vários de uma vez — 1 update otimista + 1 persist, não N. */
  const unlockAll = useCallback(
    (slugs: string[]) => {
      unlockManySlugs(slugs);
    },
    [unlockManySlugs],
  );

  const isUnlocked = useCallback(
    (slug: string) => unlockedExercises.has(slug),
    [unlockedExercises],
  );

  return {
    unlocked: unlockedExercises,
    unlock,
    unlockAll,
    isUnlocked,
    unlockedCount: unlockedExercises.size,
  };
}
