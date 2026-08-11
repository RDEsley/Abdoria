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
    return { atual: 0, maior: computeLongestStreakFromWorkouts([...workoutKeys], frozenSet) };
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
      let connectedByFrozenDays = gap > 1;
      let cursor = addDaysSaoPaulo(prevKey, 1);
      while (connectedByFrozenDays && cursor !== key) {
        if (!frozenSet.has(cursor)) {
          connectedByFrozenDays = false;
          break;
        }
        cursor = addDaysSaoPaulo(cursor, 1);
      }

      if (gap === 1 || connectedByFrozenDays) {
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

/**
 * Detecta quantos dias consecutivos (a partir de ontem, andando pra trás) precisam de
 * Frozen Streak pra reconectar com o último treino real — até o limite de itens
 * disponíveis (`maxFreezes`). Funciona como "ponte": continua detectando os dias perdidos
 * mesmo que o usuário já tenha treinado hoje na volta, pra preservar a corrente antiga→hoje.
 *
 * Só retorna dias se a ponte realmente fecha dentro do limite de itens — um buraco maior
 * que `maxFreezes` não é parcialmente coberto (mesma regra do Duolingo: sem item suficiente,
 * a corrente quebra).
 */
export function findStreakMissedDaysForFreeze(
  histories: StreakWorkoutDay[],
  frozenDates: string[] = [],
  maxFreezes: number,
): string[] {
  if (maxFreezes <= 0) return [];

  const today = getTodaySaoPaulo();
  const yesterday = addDaysSaoPaulo(today, -1);
  const workoutKeys = new Set(uniqueWorkoutDayKeys(histories));
  if (workoutKeys.has(yesterday)) return []; // ontem teve treino: nada a cobrir

  const frozenSet = new Set(frozenDates);
  const missedDays: string[] = [];
  let cursor = yesterday;

  // Limite de segurança: nunca existe motivo real pra uma ponte de congelamento
  // ultrapassar um ano — evita loop infinito se `frozenDates` vier corrompido/sem fim.
  for (let guard = 0; guard < 365; guard += 1) {
    if (workoutKeys.has(cursor)) return missedDays; // achou o treino real que fecha a ponte
    if (frozenSet.has(cursor)) {
      cursor = addDaysSaoPaulo(cursor, -1); // já congelado antes, não conta contra o limite
      continue;
    }
    if (missedDays.length >= maxFreezes) return []; // buraco maior que os itens disponíveis
    missedDays.push(cursor);
    cursor = addDaysSaoPaulo(cursor, -1);
  }

  return [];
}
