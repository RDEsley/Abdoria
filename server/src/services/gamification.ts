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
  findStreakMissedDaysForFreeze,
  workoutDayKey,
} from '../../../shared/streak/protection.js';
import {
  ATIVIDADES_MIN_DESCANSO,
  isAtividadeHistory,
  isDiaDeTreino,
} from '../../../shared/atividades.js';
import { consumeInventoryItem, getItemCount } from './inventory.js';
import { Notifications } from '../repositories/notification-repository.js';
import { User, type UserRecord } from '../domain/User.js';
import type { UserMutable } from '../repositories/user-repository.js';
import { WorkoutHistory } from '../domain/WorkoutHistory.js';
import { AFK_ENEMIES } from '../../../shared/afk/combat.js';
import { PATROL_WEAPON_BY_ID, resolvePatrolArmas } from '../../../shared/patrol/shop.js';
import { COSMETIC_BY_ID } from '../../../shared/cosmetics.js';
import {
  getTodaySaoPaulo,
  getHourSaoPaulo,
  getSaoPauloWeekday,
  getWeekStartSaoPaulo,
  startOfDaySaoPaulo,
  endOfDaySaoPaulo,
} from '../utils/timezone.js';

export { ACHIEVEMENTS };

export {
  XP_WORKOUT_BASE,
  XP_PER_EXERCISE as XP_SERIES,
  XP_ACHIEVEMENT_BONUS as XP_ACHIEVEMENT,
  XP_DAILY_CAP_BASE as XP_DAILY_CAP,
  streakXpBonus,
} from '../types/index.js';

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
  treino_nome?: string;
};

function computeStreakFromHistories(
  histories: HistorySummary[],
  frozenDates: string[] = [],
): { atual: number; maior: number } {
  return computeStreakWithFrozenDays(histories, frozenDates);
}

/**
 * Filtra o histórico pro cálculo de streak segundo as regras de Atividades:
 * - Treino real sempre sustenta o dia.
 * - Em dia de TREINO agendado, atividade nunca sustenta a streak — quem
 *   garante o dia é o treino (elas ficam só pro calendário/conquistas).
 * - Em dia de DESCANSO, as atividades sustentam o dia desde que o usuário
 *   tenha concluído pelo menos `ATIVIDADES_MIN_DESCANSO` naquele dia.
 * Usa o `dias_semana` atual do perfil como aproximação do que valia em cada data.
 */
function historiesEligibleForStreak(
  histories: HistorySummary[],
  diasSemana: number[] | null | undefined,
): HistorySummary[] {
  const porDia = new Map<string, { treino: boolean; atividades: number }>();
  for (const h of histories) {
    const key = workoutDayKey(h.concluido_em);
    const dia = porDia.get(key) ?? { treino: false, atividades: 0 };
    if (isAtividadeHistory(h.treino_nome)) dia.atividades += 1;
    else dia.treino = true;
    porDia.set(key, dia);
  }

  return histories.filter((h) => {
    if (!isAtividadeHistory(h.treino_nome)) return true;
    const dia = porDia.get(workoutDayKey(h.concluido_em));
    if (!dia) return false;
    if (dia.treino) return true; // o dia já está garantido pelo treino
    const weekday = getSaoPauloWeekday(new Date(h.concluido_em));
    if (isDiaDeTreino(diasSemana, weekday)) return false;
    return dia.atividades >= ATIVIDADES_MIN_DESCANSO;
  });
}

/**
 * Tenta consumir Frozen Streak para cobrir dias perdidos (1 ou mais consecutivos, até o
 * limite de itens no inventário). Retorna as datas efetivamente congeladas nesta chamada
 * (vazio se nenhum congelamento foi aplicado) — usado pelo chamador pra gerar a notificação.
 */
export function applyStreakFreezeProtection(
  user: UserRecord,
  histories: HistorySummary[],
): string[] {
  if (!user.gamificacao.streak_congelamentos) {
    user.gamificacao.streak_congelamentos = [];
  }

  const frozenDates = user.gamificacao.streak_congelamentos;
  const maxFreezes = getItemCount(user, FROZEN_STREAK_ITEM_ID);
  const missedDays = findStreakMissedDaysForFreeze(histories, frozenDates, maxFreezes);
  if (missedDays.length === 0) return [];

  const streakWithoutFreeze = computeStreakWithFrozenDays(histories, frozenDates);
  const streakWithPendingFreeze = computeStreakWithFrozenDays(histories, [
    ...frozenDates,
    ...missedDays,
  ]);

  // Só consome os itens se o congelamento realmente estende a ofensiva (faz a ponte).
  // Cobre tanto "streak iria a 0" quanto "treinou hoje mas perderia a corrente longa".
  if (streakWithPendingFreeze.atual <= streakWithoutFreeze.atual) return [];

  if (!consumeInventoryItem(user, FROZEN_STREAK_ITEM_ID, missedDays.length)) return [];

  user.gamificacao.streak_congelamentos.push(...missedDays);
  user.gamificacao.streak_freeze_notice_pending = true;
  user.gamificacao.streak_atual = streakWithPendingFreeze.atual;
  user.gamificacao.streak_maior = Math.max(
    user.gamificacao.streak_maior,
    streakWithPendingFreeze.maior,
  );

  return missedDays;
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

/** Arma OU cosmético (magia/moldura) de raridade Mítica na conta do jogador. */
function ownsMythicItem(user: UserRecord): boolean {
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas).desbloqueados;
  for (const id of armas) {
    if (PATROL_WEAPON_BY_ID[id]?.raridade === 'mitico') return true;
  }
  for (const id of user.cosmeticos?.desbloqueados ?? []) {
    if (COSMETIC_BY_ID[id]?.raridade === 'mitico') return true;
  }
  return false;
}

/** Quantas semanas distintas tiveram treino nos 7 dias — 0 se nenhuma. */
function countPerfectWeeks(histories: HistorySummary[]): number {
  const weeks = new Map<string, Set<number>>();

  for (const history of histories) {
    const date = new Date(history.concluido_em);
    const weekKey = getWeekStart(date).toISOString();
    const days = weeks.get(weekKey) ?? new Set<number>();
    days.add(getSaoPauloWeekday(date));
    weeks.set(weekKey, days);
  }

  return [...weeks.values()].filter((days) => days.size >= 7).length;
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
  const since = resetDate
    ? new Date(Math.max(weekStart.getTime(), resetDate.getTime()))
    : weekStart;

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

export function resetXpDiarioIfNeeded(user: UserRecord): boolean {
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

export async function evaluateAchievements(user: UserRecord): Promise<string[]> {
  const histories = await WorkoutHistory.find(
    { usuario_id: user.id },
    { sort: { concluido_em: -1 } },
  );
  return evaluateAchievementsFromHistories(user, histories as HistorySummary[]);
}

export function evaluateAchievementsFromHistories(
  user: UserRecord,
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
  const streakHistories = historiesEligibleForStreak(summary, user.perfil_treino?.dias_semana);
  const streak = computeStreakFromHistories(
    streakHistories,
    user.gamificacao.streak_congelamentos ?? [],
  );
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
  if (summary.some((h) => getHourSaoPaulo(new Date(h.concluido_em)) < 8))
    unlocked.add('early_bird');
  if (summary.some((h) => getHourSaoPaulo(new Date(h.concluido_em)) >= 22))
    unlocked.add('night_owl');
  if (hasWeekendWarrior(summary)) unlocked.add('fim_de_semana');
  if (ciclosSemana.has('A') && ciclosSemana.has('B')) unlocked.add('ciclo_ab');
  if (streak.atual >= 14 || streak.maior >= 14) unlocked.add('streak_14');
  if (streak.atual >= 30 || streak.maior >= 30) unlocked.add('streak_30');
  if (totalExercises >= 100) unlocked.add('exercicios_100');

  const allMusclesTrained = (
    ['superior', 'inferior', 'obliquos', 'core'] as MusculoPrincipal[]
  ).every((m) => counts[m] > 0);
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
  const perfectWeeks = countPerfectWeeks(summary);
  if (perfectWeeks >= 1) unlocked.add('semana_perfeita');
  if (streak.atual >= 365 || streak.maior >= 365) unlocked.add('streak_365');
  if (user.gamificacao.nivel_xp >= 5000) unlocked.add('xp_mestre');

  // —— Novas (Rodada 10) ——
  if (streak.atual >= 160 || streak.maior >= 160) unlocked.add('streak_160');
  if ((user.gamificacao.streak_congelamentos?.length ?? 0) >= 10)
    unlocked.add('freeze_streak_10x');
  if (level >= 15) unlocked.add('nivel_15');
  if (level >= 20) unlocked.add('nivel_20');
  if (user.gamificacao.nivel_xp >= 10_000) unlocked.add('xp_10000');
  if (user.gamificacao.nivel_xp >= 25_000) unlocked.add('xp_25000');
  if (totalWorkouts >= 200) unlocked.add('treinos_200');
  if (totalMinutes >= 1000) unlocked.add('minutos_1000');
  if (totalExercises >= 1000) unlocked.add('exercicios_1000');

  const atividadesTotal = summary.filter((h) => isAtividadeHistory(h.treino_nome)).length;
  if (atividadesTotal >= 25) unlocked.add('atividades_25');
  if (atividadesTotal >= 100) unlocked.add('atividades_100');

  const madrugadaDias = new Set(
    summary
      .filter((h) => getHourSaoPaulo(new Date(h.concluido_em)) < 8)
      .map((h) => workoutDayKey(h.concluido_em)),
  ).size;
  if (madrugadaDias >= 10) unlocked.add('madrugador_10');

  const corujaDias = new Set(
    summary
      .filter((h) => getHourSaoPaulo(new Date(h.concluido_em)) >= 22)
      .map((h) => workoutDayKey(h.concluido_em)),
  ).size;
  if (corujaDias >= 10) unlocked.add('coruja_10');

  const bestiarioCount = user.gamificacao.bestiario_desbloqueados?.length ?? 0;
  if (bestiarioCount >= 10) unlocked.add('bestiario_10');
  if (bestiarioCount >= Object.keys(AFK_ENEMIES).length) unlocked.add('bestiario_completo');

  if ((user.cosmeticos?.moedas_total_ganhas ?? 0) >= 1000) unlocked.add('moedas_1000');
  if (ownsMythicItem(user)) unlocked.add('item_mitico');
  if (perfectWeeks >= 4) unlocked.add('semanas_perfeitas_4');

  return [...unlocked];
}

const ACHIEVEMENT_PCT_CACHE_MS = 10 * 60 * 1000;
let achievementPctCache: { at: number; percentages: Record<string, number> } | null = null;

/**
 * Percentual real (não fictício) de jogadores elegíveis com cada conquista — cacheado por
 * 10min em memória (não precisa ser em tempo real, e recalcular em toda request de conquistas
 * seria caro conforme a base de usuários cresce).
 */
export async function getAchievementUnlockPercentages(): Promise<Record<string, number>> {
  if (achievementPctCache && Date.now() - achievementPctCache.at < ACHIEVEMENT_PCT_CACHE_MS) {
    return achievementPctCache.percentages;
  }

  const { total, counts } = await User.achievementUnlockCounts();
  const percentages: Record<string, number> = {};
  for (const achievement of ACHIEVEMENTS) {
    percentages[achievement.id] = total > 0 ? ((counts[achievement.id] ?? 0) / total) * 100 : 0;
  }

  achievementPctCache = { at: Date.now(), percentages };
  return percentages;
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
  const streakHistories = historiesEligibleForStreak(histories, user.perfil_treino?.dias_semana);

  const frozenDays = applyStreakFreezeProtection(user, streakHistories);

  const frozenDates = user.gamificacao.streak_congelamentos ?? [];
  const streakAfterFreeze = computeStreakFromHistories(streakHistories, frozenDates);

  user.gamificacao.total_minutos = Math.floor(totalSeconds / 60);
  user.gamificacao.streak_atual = streakAfterFreeze.atual;
  user.gamificacao.streak_maior = Math.max(user.gamificacao.streak_maior, streakAfterFreeze.maior);
  user.gamificacao.conquistas = evaluateAchievementsFromHistories(user, histories);

  await user.save();

  if (frozenDays.length > 0) {
    await notifyStreakFrozen(userId, frozenDays);
  }

  return user;
}

async function notifyStreakFrozen(userId: string, frozenDays: string[]): Promise<void> {
  const dayLabel = frozenDays.length === 1 ? 'dia perdido' : `${frozenDays.length} dias perdidos`;
  await Notifications.createMany([
    {
      user_id: userId,
      tipo: 'streak_frozen',
      titulo: 'Frozen Streak salvou sua ofensiva!',
      corpo: `Você não treinou, mas ${dayLabel} foram protegidos e sua sequência continua.`,
      payload: { frozen_days: frozenDays },
    },
  ]);
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
