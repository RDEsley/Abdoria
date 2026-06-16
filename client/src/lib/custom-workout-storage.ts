import type { WorkoutQueueItem } from '@/types';

const STORAGE_KEY = 'abdoria_custom_workout';

export function loadCustomWorkout(): WorkoutQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkoutQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomWorkout(items: WorkoutQueueItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
