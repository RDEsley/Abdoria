import { ACHIEVEMENTS } from '../data/achievements.js';
import type { MusculoPrincipal } from '../types/index.js';
import {
  XP_ACHIEVEMENT_BONUS,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  FROZEN_STREAK_ITEM_ID,
  streakXpBonus,
  xpLevelFromTotal,
} from '../types/index.js';
import {
  computeStreakWithFrozenDays,
  findStreakMissedDayForFreeze,
} from '../../../shared/streak/protection.js';
import { consumeInventoryItem, getItemCount } from './inventory.js';
import { User, type UserDocument } from '../domain/User.js';
import type { UserMutable } from '../repositories/user-repository.js';
import { WorkoutHistory } from '../domain/WorkoutHistory.js';
import {
  getTodaySaoPaulo,
  getHourSaoPaulo,
  getSaoPauloWeekday,
  getWeekStartSaoPaulo,
  startOfDaySaoPaulo,
  endOfDaySaoPaulo,
  isSameDaySaoPaulo,
} from '../utils/timezone.js';

export { ACHIEVEMENTS };

export {
  XP_WORKOUT_BASE,
  XP_PER_EXERCISE as XP_SERIES,
  XP_ACHIEVEMENT_BONUS as XP_ACHIEVEMENT,
  XP_DAILY_CAP_BASE as XP_DAILY_CAP,
  dailyXpCap,
  streakXpBonus,
} from '../types/index.js';

function startOfDay(date: Date): Date {
  return startOfDaySaoPaulo(date);
}

function isSameDay(a: Date, b: Date): boolean {
  return isSameDaySaoPaulo(a, b);
}

function getWeekStart(date: Date): Date {
  const weekKey = getWeekStartSaoPaulo(date);
  const [y, m, d] = weekKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export async function countTotalExercises(userId: string): Promise<number> {
  const result = await WorkoutHistory.aggregate([
    { $match: { usuario_id: userId } },
    { $group: { _id: null, total: { $sum: { $size: '$exercicios' } } } },
  ]);
  return (result[0] as { total?: number })?.total ?? 0;
}

type HistorySummary = {
  concluido_em: Date | string;
  exercicios: unknown[];
  musculos_estimulados: MusculoPrincipal[];
  treino_tipo?: string;
  duracao_total_segundos?: number;
};

function computeStreakFromHistories(histories: HistorySummary[], frozenDates: string[] = []): { atual: number; maior: number } {
  return computeStreakWithFrozenDays(histories, frozenDates);
}

export async function computeStreak(userId: string): Promise<{ atual: number; maior: number }> {
  const histories = await WorkoutHistory.find(
    { usuario_id: userId },
    { sort: { concluido_em: -1 } },
  );

  return computeStreakFromHistories(histories as HistorySummary[]);
}

/** Tenta consumir Frozen Streak para cobrir exatamente 1 dia perdido. */
export function applyStreakFreezeProtection(
  user: UserDocument,
  histories: HistorySummary[],
): boolean {
  if (!user.gamificacao.streak_congelamentos) {
    user.gamificacao.streak_congelamentos = [];
  }

  const missedDay = findStreakMissedDayForFreeze(histories, user.gamificacao.streak_congelamentos);
  if (!missedDay) return false;

  const frozenDates = user.gamificacao.streak_congelamentos;
  const streakWithoutFreeze = computeStreakWithFrozenDays(histories, frozenDates);
  if (streakWithoutFreeze.atual > 0) return false;

  const streakWithPendingFreeze = computeStreakWithFrozenDays(histories, [...frozenDates, missedDay]);
  if (streakWithPendingFreeze.atual <= 0) return false;

  if (getItemCount(user, FROZEN_STREAK_ITEM_ID) < 1) return false;
  if (!consumeInventoryItem(user, FROZEN_STREAK_ITEM_ID, 1)) return false;

  user.gamificacao.streak_congelamentos.push(missedDay);
  user.gamificacao.streak_freeze_notice_pending = true;
  user.gamificacao.streak_atual = streakWithPendingFreeze.atual;
  user.gamificacao.streak_maior = Math.max(user.gamificacao.streak_maior, streakWithPendingFreeze.maior);

  return true;
}

function hasWeekendWarrior(histories: HistorySummary[]): boolean {
  const weeks = new Map<string, Set<number>>();

  for (const history of histories) {
    const date = new Date(history.concluido_em);
    const weekday = getSaoPauloWeekday(date);
    if (weekday !== 0 && weekday !== 6) continue;

    const weekKey = getWeekStart(date).toISOString();
    const days = weeks.get(weekKey) ?? new Set<number>();
    days.add(weekday);
    weeks.set(weekKey, days);
  }

  return [...weeks.values()].some((days) => days.has(0) && days.has(6));
}

function hasPerfectWeek(histories: HistorySummary[]): boolean {
  const weeks = new Map<string, Set<number>>();

  for (const history of histories) {
    const date = new Date(history.concluido_em);
    const weekKey = getWeekStart(date).toISOString();
    const days = weeks.get(weekKey) ?? new Set<number>();
    days.add(getSaoPauloWeekday(date));
    weeks.set(weekKey, days);
  }

  return [...weeks.values()].some((days) => days.size >= 7);
}

function weeklyTreinoTypes(histories: HistorySummary[], weekStart: Date): Set<string> {
  return new Set(
    histories
      .filter((h) => new Date(h.concluido_em) >= weekStart)
      .map((h) => h.treino_tipo)
      .filter(Boolean) as string[],
  );
}

export async function getWeeklyMuscles(
  userId: string,
  resetAt: Date | string | null,
): Promise<Record<MusculoPrincipal, number>> {
  const weekStart = getWeekStart(new Date());
  const resetDate = resetAt ? new Date(resetAt) : null;
  const since = resetDate ? new Date(Math.max(weekStart.getTime(), resetDate.getTime())) : weekStart;

  const histories = await WorkoutHistory.find({
    usuario_id: userId,
    concluido_em: { $gte: since.toISOString() },
  });

  const counts: Record<MusculoPrincipal, number> = {
    superior: 0,
    inferior: 0,
    obliquos: 0,
    core: 0,
    completo: 0,
  };

  for (const history of histories) {
    for (const muscle of history.musculos_estimulados ?? []) {
      counts[muscle as MusculoPrincipal] += 1;
    }
  }

  return counts;
}

export function resetXpDiarioIfNeeded(user: UserDocument): boolean {
  const today = getTodaySaoPaulo();
  if (!user.xp_diario || user.xp_diario.data_reset !== today) {
    user.xp_diario = {
      ganho_hoje: 0,
      data_reset: today,
    };
    return true;
  }
  if (typeof user.xp_diario.ganho_hoje !== 'number') {
    user.xp_diario.ganho_hoje = 0;
  }
  return false;
}

export async function evaluateAchievements(user: UserDocument): Promise<string[]> {
  const histories = await WorkoutHistory.find(
    { usuario_id: user.id },
    { sort: { concluido_em: -1 } },
  );
  return evaluateAchievementsFromHistories(user, histories as HistorySummary[]);
}

export function evaluateAchievementsFromHistories(
  user: UserDocument,
  histories: HistorySummary[],
): string[] {
  const weekStart = getWeekStart(new Date());
  const resetDate = user.muscle_map_reset_at ? new Date(user.muscle_map_reset_at) : null;
  const since = resetDate
    ? new Date(Math.max(weekStart.getTime(), resetDate.getTime()))
    : weekStart;

  const summary = histories;
  const totalWorkouts = summary.length;
  const totalExercises = summary.reduce((sum, h) => sum + h.exercicios.length, 0);
  const totalMinutes = user.gamificacao.total_minutos;
  const streak = computeStreakFromHistories(summary, user.gamificacao.streak_congelamentos ?? []);
  const level = xpLevelFromTotal(user.gamificacao.nivel_xp);

  const weeklyHistories = summary.filter((h) => new Date(h.concluido_em) >= since);
  const counts: Record<MusculoPrincipal, number> = {
    superior: 0,
    inferior: 0,
    obliquos: 0,
    core: 0,
    completo: 0,
  };

  for (const history of weeklyHistories) {
    for (const muscle of history.musculos_estimulados) {
      counts[muscle as MusculoPrincipal] += 1;
    }
  }

  const ciclosSemana = weeklyTreinoTypes(summary, weekStart);
  const unlocked = new Set(user.gamificacao.conquistas);

  if (totalWorkouts > 0) unlocked.add('primeiro_treino');
  if (streak.atual >= 2 || streak.maior >= 2) unlocked.add('streak_2');
  if (streak.atual >= 3 || streak.maior >= 3) unlocked.add('streak_3');
  if (totalWorkouts >= 5) unlocked.add('treinos_5');
  if (totalMinutes >= 60) unlocked.add('minutos_60');
  if (streak.atual >= 7 || streak.maior >= 7) unlocked.add('streak_7');
  if (totalExercises >= 50) unlocked.add('exercicios_50');
  if (level >= 3) unlocked.add('nivel_3');
  if (summary.some((h) => getHourSaoPaulo(new Date(h.concluido_em)) < 8)) unlocked.add('early_bird');
  if (summary.some((h) => getHourSaoPaulo(new Date(h.concluido_em)) >= 22)) unlocked.add('night_owl');
  if (hasWeekendWarrior(summary)) unlocked.add('fim_de_semana');
  if (ciclosSemana.has('A') && ciclosSemana.has('B')) unlocked.add('ciclo_ab');
  if (streak.atual >= 14 || streak.maior >= 14) unlocked.add('streak_14');
  if (streak.atual >= 30 || streak.maior >= 30) unlocked.add('streak_30');
  if (totalExercises >= 100) unlocked.add('exercicios_100');

  const allMusclesTrained = (['superior', 'inferior', 'obliquos', 'core'] as MusculoPrincipal[]).every(
    (m) => counts[m] > 0,
  );
  if (allMusclesTrained) unlocked.add('treino_completo');

  if (level >= 5) unlocked.add('nivel_5');
  if (['A', 'B', 'C'].every((c) => ciclosSemana.has(c))) unlocked.add('ciclo_completo');
  if (totalMinutes >= 500) unlocked.add('minutos_500');
  if (totalWorkouts >= 25) unlocked.add('treinos_25');
  if (streak.atual >= 60 || streak.maior >= 60) unlocked.add('streak_60');
  if (streak.atual >= 100 || streak.maior >= 100) unlocked.add('streak_100');
  if (totalExercises >= 500) unlocked.add('exercicios_500');
  if (level >= 10) unlocked.add('nivel_10');
  if (totalWorkouts >= 100) unlocked.add('treinos_100');
  if (hasPerfectWeek(summary)) unlocked.add('semana_perfeita');
  if (streak.atual >= 365 || streak.maior >= 365) unlocked.add('streak_365');
  if (user.gamificacao.nivel_xp >= 5000) unlocked.add('xp_mestre');

  return [...unlocked];
}

export async function syncUserGamification(userId: string): Promise<UserMutable | null> {
  const user = await User.findById(userId);
  if (!user) return null;

  resetXpDiarioIfNeeded(user);

  const histories = (await WorkoutHistory.find(
    { usuario_id: userId },
    { sort: { concluido_em: -1 } },
  )) as HistorySummary[];

  const totalSeconds = histories.reduce((sum, h) => sum + (h.duracao_total_segundos ?? 0), 0);

  applyStreakFreezeProtection(user, histories);

  const frozenDates = user.gamificacao.streak_congelamentos ?? [];
  const streakAfterFreeze = computeStreakFromHistories(histories, frozenDates);

  user.gamificacao.total_minutos = Math.floor(totalSeconds / 60);
  user.gamificacao.streak_atual = streakAfterFreeze.atual;
  user.gamificacao.streak_maior = Math.max(user.gamificacao.streak_maior, streakAfterFreeze.maior);
  user.gamificacao.conquistas = evaluateAchievementsFromHistories(user, histories);

  await user.save();
  return user;
}

export function calculateWorkoutXp(
  exerciseCount: number,
  streakAtual: number,
  newAchievements: string[],
): number {
  const exercicios =
    exerciseCount >= XP_DAILY_MIN_EXERCISES ? exerciseCount * XP_DAILY_PER_EXERCISE : 0;
  return exercicios + streakXpBonus(streakAtual) + newAchievements.length * XP_ACHIEVEMENT_BONUS;
}

export function hasTrainedToday(userId: string): Promise<boolean> {
  const todayStart = startOfDaySaoPaulo();
  const tomorrow = endOfDaySaoPaulo();

  return WorkoutHistory.exists({
    usuario_id: userId,
    concluido_em: { $gte: todayStart.toISOString(), $lt: tomorrow.toISOString() },
  });
}
