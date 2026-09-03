import { computeStreakWithFrozenDays, findStreakMissedDaysForFreeze } from './streak/protection.js';

export const ACTIVE_DAY_SOURCES = [
  'workout_completed',
  'activity_completed',
  'activity_minimum_completed',
  'routine_completed',
  'hydration_logged',
  'myplant_watered',
] as const;

export type ActiveDaySource = (typeof ACTIVE_DAY_SOURCES)[number];

export interface ActiveDayRecord {
  user_id: string;
  day_key: string;
  first_source: ActiveDaySource | string;
  sources: string[];
  first_at: string;
}

/** Converte chaves civis SP em instantes estáveis para a matemática existente. */
export function dayKeysToStreakHistories(dayKeys: string[]): { concluido_em: string }[] {
  return [...new Set(dayKeys)].map((key) => ({ concluido_em: `${key}T15:00:00.000Z` }));
}

export function computeStreakFromDayKeys(
  dayKeys: string[],
  frozenDates: string[] = [],
): { atual: number; maior: number } {
  return computeStreakWithFrozenDays(dayKeysToStreakHistories(dayKeys), frozenDates);
}

export function findMissedDaysFromDayKeys(
  dayKeys: string[],
  frozenDates: string[] = [],
  maxFreezes: number,
): string[] {
  return findStreakMissedDaysForFreeze(dayKeysToStreakHistories(dayKeys), frozenDates, maxFreezes);
}

export function isReservedHydrationSource(source: string): boolean {
  return source === 'hydration_logged' || source === 'myplant_watered';
}
