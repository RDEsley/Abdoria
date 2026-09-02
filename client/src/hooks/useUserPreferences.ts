import { useCallback, useMemo } from 'react';
import { usePreferencesPersist } from '@/hooks/usePreferencesPersist';
import type { UserPreferencias } from '@/types';

export function useUserPreferences(onUpdated?: () => void) {
  const { user, persist } = usePreferencesPersist();

  const fixedExerciseSlugs = useMemo(
    () => user?.preferencias?.exercicios_fixos ?? [],
    [user?.preferencias?.exercicios_fixos],
  );
  const blockedExerciseSlugs = useMemo(
    () => user?.preferencias?.exercicios_nao_recomendar ?? [],
    [user?.preferencias?.exercicios_nao_recomendar],
  );
  const fixedWorkoutIds = useMemo(
    () => user?.preferencias?.treinos_fixos ?? [],
    [user?.preferencias?.treinos_fixos],
  );
  const blockedWorkoutIds = useMemo(
    () => user?.preferencias?.treinos_nao_recomendar ?? [],
    [user?.preferencias?.treinos_nao_recomendar],
  );

  const patchPreferences = useCallback(
    async (patch: Partial<UserPreferencias>) => {
      await persist(patch, undefined, onUpdated);
    },
    [persist, onUpdated],
  );

  const toggleExercisePin = useCallback(
    (slug: string) => {
      const nextFixed = fixedExerciseSlugs.includes(slug)
        ? fixedExerciseSlugs.filter((s) => s !== slug)
        : [...fixedExerciseSlugs, slug];
      const nextBlocked = blockedExerciseSlugs.filter((s) => s !== slug);
      void patchPreferences({
        exercicios_fixos: nextFixed,
        exercicios_nao_recomendar: nextBlocked,
      });
    },
    [blockedExerciseSlugs, fixedExerciseSlugs, patchPreferences],
  );

  const toggleExerciseBlock = useCallback(
    (slug: string) => {
      const nextBlocked = blockedExerciseSlugs.includes(slug)
        ? blockedExerciseSlugs.filter((s) => s !== slug)
        : [...blockedExerciseSlugs, slug];
      const nextFixed = fixedExerciseSlugs.filter((s) => s !== slug);
      void patchPreferences({
        exercicios_nao_recomendar: nextBlocked,
        exercicios_fixos: nextFixed,
      });
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
    patchPreferences,
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
