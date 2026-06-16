import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loadUnlockedExercises, unlockExercise as persistUnlock } from '@/lib/unlocked-exercises-storage';

export function useUnlockedExercises() {
  const { user } = useAuth();
  const userId = user?._id ?? 'anonymous';
  const [unlocked, setUnlocked] = useState<Set<string>>(() => loadUnlockedExercises(userId));

  useEffect(() => {
    setUnlocked(loadUnlockedExercises(userId));
  }, [userId]);

  const unlock = useCallback(
    (slug: string) => {
      setUnlocked(persistUnlock(userId, slug));
    },
    [userId],
  );

  const isUnlocked = useCallback((slug: string) => unlocked.has(slug), [unlocked]);

  return {
    unlocked,
    unlock,
    isUnlocked,
    unlockedCount: unlocked.size,
  };
}
