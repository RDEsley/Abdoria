const STORAGE_PREFIX = 'abdoria_unlocked_exercises';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function loadUnlockedExercises(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const list = JSON.parse(raw) as string[];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function saveUnlockedExercises(userId: string, slugs: Set<string>): void {
  localStorage.setItem(storageKey(userId), JSON.stringify([...slugs]));
}

export function unlockExercise(userId: string, slug: string): Set<string> {
  const next = loadUnlockedExercises(userId);
  next.add(slug);
  saveUnlockedExercises(userId, next);
  return next;
}
