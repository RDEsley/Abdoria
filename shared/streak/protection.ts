import { addDaysSaoPaulo, getTodaySaoPaulo } from '../utils/timezone.js';

export interface StreakWorkoutDay {
  concluido_em: Date | string;
}

/** Chave `YYYY-MM-DD` (America/Sao_Paulo) de um treino. */
export function workoutDayKey(concluidoEm: Date | string): string {
  return getTodaySaoPaulo(new Date(concluidoEm));
}

export function uniqueWorkoutDayKeys(histories: StreakWorkoutDay[]): string[] {
  return [...new Set(histories.map((h) => workoutDayKey(h.concluido_em)))].sort();
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function dayDiff(fromKey: string, toKey: string): number {
  const ms = parseDayKey(toKey).getTime() - parseDayKey(fromKey).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Calcula ofensiva considerando dias congelados (Frozen Streak).
 * Dias congelados não incrementam a sequência, mas mantêm a continuidade.
 */
export function computeStreakWithFrozenDays(
  histories: StreakWorkoutDay[],
  frozenDates: string[] = [],
): { atual: number; maior: number } {
  if (histories.length === 0 && frozenDates.length === 0) {
    return { atual: 0, maior: 0 };
  }

  const workoutKeys = new Set(uniqueWorkoutDayKeys(histories));
  const frozenSet = new Set(frozenDates);
  const allActiveKeys = [...new Set([...workoutKeys, ...frozenSet])].sort().reverse();

  if (allActiveKeys.length === 0) return { atual: 0, maior: 0 };

  const today = getTodaySaoPaulo();
  const yesterday = addDaysSaoPaulo(today, -1);

  const mostRecent = allActiveKeys[0];
  if (mostRecent !== today && mostRecent !== yesterday) {
    return { atual: 0, maior: computeLongestStreakFromWorkouts([...workoutKeys]) };
  }

  let cursorKey = mostRecent === today ? today : yesterday;
  let streak = 0;

  while (true) {
    if (workoutKeys.has(cursorKey)) {
      streak += 1;
      cursorKey = addDaysSaoPaulo(cursorKey, -1);
      continue;
    }
    if (frozenSet.has(cursorKey)) {
      cursorKey = addDaysSaoPaulo(cursorKey, -1);
      continue;
    }
    break;
  }

  const maior = Math.max(streak, computeLongestStreakFromWorkouts([...workoutKeys], frozenSet));
  return { atual: streak, maior };
}

function computeLongestStreakFromWorkouts(
  workoutKeysSortedDesc: string[],
  frozenSet: Set<string> = new Set(),
): number {
  if (workoutKeysSortedDesc.length === 0) return 0;

  const sortedAsc = [...workoutKeysSortedDesc].sort();
  let max = 0;
  let current = 0;
  let prevKey: string | null = null;

  for (const key of sortedAsc) {
    if (!prevKey) {
      current = 1;
    } else {
      const gap = dayDiff(prevKey, key);
      if (gap === 1 || (gap === 2 && frozenSet.has(addDaysSaoPaulo(prevKey, 1)))) {
        current += 1;
      } else {
        current = 1;
      }
    }
    max = Math.max(max, current);
    prevKey = key;
  }

  return max;
}

/** Detecta se ontem foi perdido e pode ser coberto por Frozen Streak (exatamente 1 dia). */
export function findStreakMissedDayForFreeze(
  histories: StreakWorkoutDay[],
  frozenDates: string[] = [],
): string | null {
  const today = getTodaySaoPaulo();
  const yesterday = addDaysSaoPaulo(today, -1);

  if (frozenDates.includes(yesterday)) return null;

  const workoutKeys = new Set(uniqueWorkoutDayKeys(histories));
  if (workoutKeys.has(yesterday) || workoutKeys.has(today)) return null;

  const sortedWorkouts = uniqueWorkoutDayKeys(histories).sort().reverse();
  if (sortedWorkouts.length === 0) return null;

  const lastWorkout = sortedWorkouts[0];
  if (dayDiff(lastWorkout, yesterday) !== 1) return null;

  return yesterday;
}
