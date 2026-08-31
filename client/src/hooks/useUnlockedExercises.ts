import { useCallback, useMemo } from 'react';
import { useApp } from '@/hooks/useApp';
import { ALWAYS_AVAILABLE_PUSH_UP_SLUGS } from '@shared/exercises';

export function useUnlockedExercises() {
  const { unlockedExercises, unlockExercise, unlockExercises: unlockManySlugs } = useApp();
  const unlocked = useMemo(
    () => new Set([...unlockedExercises, ...ALWAYS_AVAILABLE_PUSH_UP_SLUGS]),
    [unlockedExercises],
  );

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

  const isUnlocked = useCallback((slug: string) => unlocked.has(slug), [unlocked]);

  return {
    unlocked,
    unlock,
    unlockAll,
    isUnlocked,
    unlockedCount: unlocked.size,
  };
}
