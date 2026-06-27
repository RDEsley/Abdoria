import type { IExerciseDocument, IWorkoutPresetDocument, MusculoPrincipal, SavedWorkoutPreset, WorkoutQueueItem } from '@/types';

const SIMILAR_MUSCLES: Record<MusculoPrincipal, MusculoPrincipal[]> = {
  superior: ['superior', 'core'],
  inferior: ['inferior', 'core'],
  obliquos: ['obliquos', 'core', 'superior'],
  core: ['core', 'superior', 'inferior', 'obliquos'],
  completo: ['completo', 'superior', 'inferior', 'obliquos', 'core'],
};

export function getMuscleProfileFromQueue(queue: WorkoutQueueItem[]): Map<MusculoPrincipal, number> {
  const counts = new Map<MusculoPrincipal, number>();
  for (const item of queue) {
    if (!item.musculo_principal) continue;
    counts.set(item.musculo_principal, (counts.get(item.musculo_principal) ?? 0) + 1);
  }
  return counts;
}

export function getMuscleProfileFromPreset(
  preset: IWorkoutPresetDocument,
  exerciseMap: Map<string, IExerciseDocument>,
): Map<MusculoPrincipal, number> {
  const counts = new Map<MusculoPrincipal, number>();
  for (const pe of preset.exercicios) {
    const ex = exerciseMap.get(pe.slug);
    if (!ex) continue;
    counts.set(ex.musculo_principal, (counts.get(ex.musculo_principal) ?? 0) + 1);
  }
  return counts;
}

function dominantMuscle(counts: Map<MusculoPrincipal, number>): MusculoPrincipal | null {
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function muscleOverlap(a: Set<MusculoPrincipal>, b: Set<MusculoPrincipal>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((m) => b.has(m)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

export function similarityScore(
  reference: Map<MusculoPrincipal, number>,
  candidate: Map<MusculoPrincipal, number>,
): number {
  if (reference.size === 0 || candidate.size === 0) return 0;

  const refDominant = dominantMuscle(reference);
  const candDominant = dominantMuscle(candidate);
  let score = 0;

  if (refDominant && candDominant && refDominant === candDominant) score += 10;

  if (refDominant) {
    const similar = new Set([refDominant, ...SIMILAR_MUSCLES[refDominant]]);
    for (const muscle of candidate.keys()) {
      if (similar.has(muscle)) score += 3;
    }
  }

  for (const [muscle, count] of candidate) {
    const refCount = reference.get(muscle);
    if (refCount != null) score += Math.min(refCount, count);
  }

  const refSet = new Set(reference.keys());
  const candSet = new Set(candidate.keys());
  score += muscleOverlap(refSet, candSet) * 5;

  return score;
}

function isSimilarProfile(
  reference: Map<MusculoPrincipal, number>,
  candidate: Map<MusculoPrincipal, number>,
): boolean {
  return similarityScore(reference, candidate) >= 3.5;
}

function rankBySimilarity<T>(
  items: T[],
  referenceProfile: Map<MusculoPrincipal, number>,
  getProfile: (item: T) => Map<MusculoPrincipal, number>,
): T[] {
  return [...items].sort((a, b) => {
    const scoreB = similarityScore(referenceProfile, getProfile(b));
    const scoreA = similarityScore(referenceProfile, getProfile(a));
    return scoreB - scoreA;
  });
}

export function filterSimilarPresets(
  presets: IWorkoutPresetDocument[],
  referenceProfile: Map<MusculoPrincipal, number>,
  exerciseMap: Map<string, IExerciseDocument>,
  options: { excludeId?: string | null; blockedIds?: string[] } = {},
): IWorkoutPresetDocument[] {
  const blocked = new Set(options.blockedIds ?? []);
  const filtered = presets.filter((preset) => {
    if (options.excludeId && preset.id === options.excludeId) return false;
    if (blocked.has(preset.id)) return false;
    const profile = getMuscleProfileFromPreset(preset, exerciseMap);
    return isSimilarProfile(referenceProfile, profile);
  });
  return rankBySimilarity(filtered, referenceProfile, (preset) =>
    getMuscleProfileFromPreset(preset, exerciseMap),
  );
}

export function filterSimilarSavedWorkouts(
  saved: SavedWorkoutPreset[],
  referenceProfile: Map<MusculoPrincipal, number>,
  options: { excludeId?: string | null } = {},
): SavedWorkoutPreset[] {
  const filtered = saved.filter((entry) => {
    if (options.excludeId && entry.id === options.excludeId) return false;
    const profile = getMuscleProfileFromQueue(entry.queue);
    return isSimilarProfile(referenceProfile, profile);
  });
  return rankBySimilarity(filtered, referenceProfile, (entry) => getMuscleProfileFromQueue(entry.queue));
}

export type SimilarWorkoutChoice =
  | { kind: 'preset'; id: string }
  | { kind: 'saved'; id: string };

export function listSimilarWorkoutChoices(
  similarPresets: IWorkoutPresetDocument[],
  similarSaved: SavedWorkoutPreset[],
): SimilarWorkoutChoice[] {
  return [
    ...similarPresets.map((preset) => ({ kind: 'preset' as const, id: preset.id })),
    ...similarSaved.map((saved) => ({ kind: 'saved' as const, id: saved.id })),
  ];
}

export function pickNextSimilarWorkout(
  choices: SimilarWorkoutChoice[],
  cursor: number,
): { choice: SimilarWorkoutChoice; nextCursor: number } | null {
  if (choices.length === 0) return null;
  const index = cursor % choices.length;
  return {
    choice: choices[index]!,
    nextCursor: (index + 1) % choices.length,
  };
}
