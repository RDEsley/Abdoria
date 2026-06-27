import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/lib/api';
import type { UserPreferencias } from '@/types';

export function useUserPreferences(onUpdated?: () => void) {
  const { user, refreshUser } = useAuth();

  const fixedExerciseSlugs = user?.preferencias?.exercicios_fixos ?? [];
  const blockedExerciseSlugs = user?.preferencias?.exercicios_nao_recomendar ?? [];
  const fixedWorkoutIds = user?.preferencias?.treinos_fixos ?? [];
  const blockedWorkoutIds = user?.preferencias?.treinos_nao_recomendar ?? [];

  const patchPreferences = useCallback(
    async (patch: Partial<UserPreferencias>) => {
      if (!user) return;
      await updateMe({
        preferencias: {
          ...user.preferencias,
          ...patch,
        },
      });
      await refreshUser();
      onUpdated?.();
    },
    [user, refreshUser, onUpdated],
  );

  const toggleExercisePin = useCallback(
    (slug: string) => {
      const nextFixed = fixedExerciseSlugs.includes(slug)
        ? fixedExerciseSlugs.filter((s) => s !== slug)
        : [...fixedExerciseSlugs, slug];
      const nextBlocked = blockedExerciseSlugs.filter((s) => s !== slug);
      void patchPreferences({ exercicios_fixos: nextFixed, exercicios_nao_recomendar: nextBlocked });
    },
    [blockedExerciseSlugs, fixedExerciseSlugs, patchPreferences],
  );

  const toggleExerciseBlock = useCallback(
    (slug: string) => {
      const nextBlocked = blockedExerciseSlugs.includes(slug)
        ? blockedExerciseSlugs.filter((s) => s !== slug)
        : [...blockedExerciseSlugs, slug];
      const nextFixed = fixedExerciseSlugs.filter((s) => s !== slug);
      void patchPreferences({ exercicios_nao_recomendar: nextBlocked, exercicios_fixos: nextFixed });
    },
    [blockedExerciseSlugs, fixedExerciseSlugs, patchPreferences],
  );

  const toggleWorkoutPin = useCallback(
    (presetId: string) => {
      const nextFixed = fixedWorkoutIds.includes(presetId)
        ? fixedWorkoutIds.filter((id) => id !== presetId)
        : [...fixedWorkoutIds, presetId];
      const nextBlocked = blockedWorkoutIds.filter((id) => id !== presetId);
      void patchPreferences({ treinos_fixos: nextFixed, treinos_nao_recomendar: nextBlocked });
    },
    [blockedWorkoutIds, fixedWorkoutIds, patchPreferences],
  );

  const toggleWorkoutBlock = useCallback(
    (presetId: string) => {
      const nextBlocked = blockedWorkoutIds.includes(presetId)
        ? blockedWorkoutIds.filter((id) => id !== presetId)
        : [...blockedWorkoutIds, presetId];
      const nextFixed = fixedWorkoutIds.filter((id) => id !== presetId);
      void patchPreferences({ treinos_nao_recomendar: nextBlocked, treinos_fixos: nextFixed });
    },
    [blockedWorkoutIds, fixedWorkoutIds, patchPreferences],
  );

  return {
    fixedExerciseSlugs,
    blockedExerciseSlugs,
    fixedWorkoutIds,
    blockedWorkoutIds,
    toggleExercisePin,
    toggleExerciseBlock,
    toggleWorkoutPin,
    toggleWorkoutBlock,
  };
}
