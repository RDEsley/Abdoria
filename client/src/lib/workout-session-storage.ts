import type { ActiveWorkout } from '@/types';
import type { WorkoutPlayerPhase, WorkoutSideIndex } from '@shared/workout-player';
import { SerializedOperationQueue } from '@shared/persistence/serialized-operation-queue';
import { Capacitor } from '@capacitor/core';

const SNAPSHOT_KEY = 'evolyn_active_workout_v2';
const LEGACY_KEY = 'abdoria_active_workout';
const SNAPSHOT_MAX_AGE_MS = 36 * 60 * 60 * 1000;
const VALID_PHASES = new Set<WorkoutPlayerPhase>([
  'ready',
  'working',
  'side_transition',
  'resting',
  'done',
]);
const nativeSnapshotQueue = new SerializedOperationQueue();

export interface ActiveWorkoutSnapshot {
  version: 2;
  sessionId: string;
  workout: ActiveWorkout;
  exerciseIndex: number;
  setIndex: number;
  sideIndex: WorkoutSideIndex;
  phase: WorkoutPlayerPhase;
  secondsLeft: number;
  /** Duração original da fase atual, necessária para restaurar/reiniciar o descanso. */
  timerTotalSeconds?: number;
  paused: boolean;
  startedAt: number;
  pausedMs: number;
  updatedAt: number;
}

export interface WorkoutSessionStorageAdapter {
  read(): ActiveWorkoutSnapshot | null;
  write(snapshot: ActiveWorkoutSnapshot): void;
  clear(): void;
}

function parseSnapshot(raw: string | null): ActiveWorkoutSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ActiveWorkoutSnapshot;
    const current = value.workout?.queue?.[value.exerciseIndex];
    const valid =
      value.version === 2 &&
      Boolean(current) &&
      Number.isInteger(value.exerciseIndex) &&
      value.exerciseIndex >= 0 &&
      Number.isInteger(value.setIndex) &&
      value.setIndex >= 0 &&
      value.setIndex < (current?.series ?? 1) &&
      (value.sideIndex === 0 || value.sideIndex === 1) &&
      VALID_PHASES.has(value.phase) &&
      Date.now() - value.updatedAt <= SNAPSHOT_MAX_AGE_MS;
    return valid ? value : null;
  } catch {
    return null;
  }
}

export const webWorkoutSessionStorage: WorkoutSessionStorageAdapter = {
  read() {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    const snapshot = parseSnapshot(raw);
    if (raw && !snapshot) localStorage.removeItem(SNAPSHOT_KEY);
    return snapshot;
  },
  write(snapshot) {
    const value = JSON.stringify(snapshot);
    localStorage.setItem(SNAPSHOT_KEY, value);
    window.dispatchEvent(new CustomEvent('evolyn:workout-snapshot'));
    if (Capacitor.isNativePlatform()) {
      nativeSnapshotQueue.enqueueLatestWrite(async () => {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key: SNAPSHOT_KEY, value });
      });
    }
  },
  clear() {
    localStorage.removeItem(SNAPSHOT_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
    window.dispatchEvent(new CustomEvent('evolyn:workout-snapshot'));
    if (Capacitor.isNativePlatform()) {
      nativeSnapshotQueue.enqueueBarrier(async () => {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: SNAPSHOT_KEY });
      });
    }
  },
};

/** Hidrata o espelho síncrono antes de uma retomada nativa. */
export async function hydrateNativeWorkoutSnapshot(): Promise<void> {
  if (!Capacitor.isNativePlatform() || localStorage.getItem(SNAPSHOT_KEY)) return;
  const revision = nativeSnapshotQueue.captureRevision();
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key: SNAPSHOT_KEY });
  if (value && nativeSnapshotQueue.isCurrent(revision) && !localStorage.getItem(SNAPSHOT_KEY)) {
    localStorage.setItem(SNAPSHOT_KEY, value);
  }
}

export function createWorkoutSnapshot(workout: ActiveWorkout): ActiveWorkoutSnapshot {
  return {
    version: 2,
    sessionId: crypto.randomUUID(),
    workout,
    exerciseIndex: 0,
    setIndex: 0,
    sideIndex: 0,
    phase: 'ready',
    secondsLeft: 0,
    timerTotalSeconds: 0,
    paused: false,
    startedAt: 0,
    pausedMs: 0,
    updatedAt: Date.now(),
  };
}

export function readWorkoutOrLegacy(): ActiveWorkoutSnapshot | null {
  const current = webWorkoutSessionStorage.read();
  if (current) return current;
  const legacy = sessionStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  try {
    const snapshot = createWorkoutSnapshot(JSON.parse(legacy) as ActiveWorkout);
    webWorkoutSessionStorage.write(snapshot);
    sessionStorage.removeItem(LEGACY_KEY);
    return snapshot;
  } catch {
    return null;
  }
}
