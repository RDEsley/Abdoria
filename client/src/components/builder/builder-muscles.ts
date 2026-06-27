import type { IExerciseDocument, IWorkoutPresetDocument, MusculoPrincipal, SavedWorkoutPreset } from '@/types';

/** Agrega os grupamentos musculares mais frequentes de um preset sugerido. */
export function getPresetPrimaryMuscles(
  preset: IWorkoutPresetDocument,
  exerciseMap: Map<string, IExerciseDocument>,
  limit = 3,
): MusculoPrincipal[] {
  const counts = new Map<MusculoPrincipal, number>();

  for (const pe of preset.exercicios) {
    const ex = exerciseMap.get(pe.slug);
    if (!ex) continue;
    counts.set(ex.musculo_principal, (counts.get(ex.musculo_principal) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([muscle]) => muscle);
}

/** Agrega os grupamentos musculares de um treino salvo. */
export function getSavedWorkoutMuscles(saved: SavedWorkoutPreset, limit = 3): MusculoPrincipal[] {
  const counts = new Map<MusculoPrincipal, number>();

  for (const item of saved.queue) {
    if (!item.musculo_principal) continue;
    counts.set(item.musculo_principal, (counts.get(item.musculo_principal) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([muscle]) => muscle);
}
