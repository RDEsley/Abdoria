import type { ActiveWorkout } from '@/types';

export const WORKOUT_STARTED_AT_KEY = 'abdoria_workout_started_at';
export const WORKOUT_ENDED_AT_KEY = 'abdoria_workout_ended_at';
export const WORKOUT_PAUSED_MS_KEY = 'abdoria_workout_paused_ms';

export function readWorkoutStartedAt(): number {
  const raw = sessionStorage.getItem(WORKOUT_STARTED_AT_KEY);
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function persistWorkoutStartedAt(timestamp = Date.now()): number {
  sessionStorage.setItem(WORKOUT_STARTED_AT_KEY, String(timestamp));
  return timestamp;
}

export function persistWorkoutEndedAt(timestamp = Date.now()): number {
  sessionStorage.setItem(WORKOUT_ENDED_AT_KEY, String(timestamp));
  return timestamp;
}

export function readWorkoutEndedAt(): number {
  const raw = sessionStorage.getItem(WORKOUT_ENDED_AT_KEY);
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function readWorkoutPausedMs(): number {
  const raw = sessionStorage.getItem(WORKOUT_PAUSED_MS_KEY);
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function persistWorkoutPausedMs(ms: number): void {
  sessionStorage.setItem(WORKOUT_PAUSED_MS_KEY, String(Math.max(0, ms)));
}

export function clearWorkoutDurationSession(): void {
  sessionStorage.removeItem(WORKOUT_STARTED_AT_KEY);
  sessionStorage.removeItem(WORKOUT_ENDED_AT_KEY);
  sessionStorage.removeItem(WORKOUT_PAUSED_MS_KEY);
}

export function estimateWorkoutDurationSeconds(workout: ActiveWorkout): number {
  const defaultRest = workout.config.descanso_padrao_seg ?? 30;
  let total = 0;

  workout.queue.forEach((item, exerciseIndex) => {
    const series = item.series ?? 3;
    const rest = item.descanso_seg ?? defaultRest;

    for (let seriesIndex = 0; seriesIndex < series; seriesIndex += 1) {
      if (item.modo === 'tempo') {
        total += item.tempo_seg ?? item.tempo_recomendado ?? 30;
      } else {
        total += (item.repeticoes ?? 12) * 3;
      }

      if (seriesIndex < series - 1) {
        total += rest;
      }
    }

    if (exerciseIndex < workout.queue.length - 1) {
      total += rest;
    }
  });

  return Math.max(total, 1);
}

export function computeWorkoutElapsedSeconds(options: {
  workout: ActiveWorkout;
  startedAt: number;
  endedAt?: number;
  pausedMs?: number;
  pauseStartedAt?: number | null;
}): number {
  const { workout, startedAt, endedAt, pausedMs = 0, pauseStartedAt = null } = options;

  if (!startedAt) {
    return estimateWorkoutDurationSeconds(workout);
  }

  const end = endedAt && endedAt > startedAt ? endedAt : Date.now();
  let pausedTotal = pausedMs;
  if (pauseStartedAt) {
    pausedTotal += Math.max(0, end - pauseStartedAt);
  }

  return Math.max(1, Math.round((end - startedAt - pausedTotal) / 1000));
}
