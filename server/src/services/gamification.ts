import { ACHIEVEMENTS } from '../data/achievements.js';
import type { MusculoPrincipal } from '../types/index.js';
import { FROZEN_STREAK_ITEM_ID, xpLevelFromTotal } from '../types/index.js';
import {
  computeStreakWithFrozenDays,
  findStreakMissedDaysForFreeze,
  workoutDayKey,
} from '../../../shared/streak/protection.js';
import { computeStreakFromDayKeys, dayKeysToStreakHistories } from '../../../shared/active-day.js';
import { ActiveDays } from '../repositories/active-days-repository.js';
import {
  STREAK_RECOVERY_UNLOCK_LOSSES,
  buildStreakRecoveryOffer,
  applyStreakRecoveryAnchor,
  type StreakRecoveryOffer,
} from '../../../shared/streak/recovery.js';
import { isActivityHistoryRow, splitHistorySessions } from '../../../shared/atividades.js';
import { consumeInventoryItem, getItemCount } from './inventory.js';
import { Notifications } from '../repositories/notification-repository.js';
import { User, type UserRecord } from '../domain/User.js';
import type { UserMutable } from '../repositories/user-repository.js';
import { WorkoutHistory } from '../domain/WorkoutHistory.js';
import { ActivityLogs } from '../repositories/activities-repository.js';
import { COSMETIC_BY_ID } from '../../../shared/cosmetics.js';
import {
  getTodaySaoPaulo,
  getHourSaoPaulo,
  getSaoPauloWeekday,
  getWeekStartSaoPaulo,
  startOfDayKeySaoPaulo,
  startOfDaySaoPaulo,
  endOfDaySaoPaulo,
} from '../utils/timezone.js';

export { ACHIEVEMENTS };

function getWeekStart(date: Date): Date {
  const weekKey = getWeekStartSaoPaulo(date);
  const [y, m, d] = weekKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

type HistorySummary = {
  concluido_em: Date | string;
  exercicios: unknown[];
  musculos_estimulados: MusculoPrincipal[];
  treino_tipo?: string;
  duracao_total_segundos?: number;
  treino_nome?: string;
  atividade?: unknown;
};

function applyStreakFreezeProtection(user: UserRecord, dayKeys: string[]): string[] {
  if (!user.gamificacao.streak_congelamentos) {
    user.gamificacao.streak_congelamentos = [];
  }

  // Opt-out: jogador desativou o uso automático no inventário — o streak
  // quebra normalmente em vez de consumir o item sozinho. `undefined` (contas
  // antigas, sem o campo) conta como ativado, que é o padrão.
  if (user.preferencias.frozen_streak_auto_usar === false) return [];

  const histories = dayKeysToStreakHistories(dayKeys);
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

  // Semântica visual: Frozen preserva a sequência — nunca parece "ganhar" um dia.
  // Se já houve ação válida hoje, `streakWithPendingFreeze.atual` pode ser preserved+1;
  // a celebração deve mostrar só o valor protegido (sem o dia de hoje).
  const today = getTodaySaoPaulo();
  const dayKeysWithoutToday = dayKeys.filter((key) => key !== today);
  const preservedStreak = computeStreakWithFrozenDays(
    dayKeysToStreakHistories(dayKeysWithoutToday),
    [...frozenDates, ...missedDays],
  ).atual;

  user.gamificacao.streak_congelamentos.push(...missedDays);
  user.gamificacao.streak_freeze_notice_pending = true;
  user.gamificacao.streak_freeze_notice = {
    frozen_days: missedDays,
    /** @deprecated use preserved_streak — mantido para clientes antigos */
    streak_atual: preservedStreak,
    preserved_streak: preservedStreak,
  };
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

/** Cosmético de raridade Mítica na conta do jogador. */
function ownsMythicItem(user: UserRecord): boolean {
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

export async function getWeeklyTrainingSeconds(userId: string): Promise<number> {
  const since = startOfDayKeySaoPaulo(getWeekStartSaoPaulo());
  const histories = await WorkoutHistory.find({
    usuario_id: userId,
    somenteTreino: true,
    concluido_em: { $gte: since.toISOString() },
  });
  return Math.round(histories.reduce((sum, h) => sum + (h.duracao_total_segundos ?? 0), 0));
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

function evaluateAchievementsFromHistories(
  user: UserRecord,
  histories: HistorySummary[],
  atividadesTotal: number,
): string[] {
  const weekStart = getWeekStart(new Date());
  const resetDate = user.muscle_map_reset_at ? new Date(user.muscle_map_reset_at) : null;
  const since = resetDate
    ? new Date(Math.max(weekStart.getTime(), resetDate.getTime()))
    : weekStart;

  const summary = histories;
  const { workouts } = splitHistorySessions(summary);
  const totalWorkouts = workouts.length;
  const totalExercises = workouts.reduce((sum, h) => sum + h.exercicios.length, 0);
  const totalMinutes = Math.floor(
    workouts.reduce((sum, h) => sum + (h.duracao_total_segundos ?? 0), 0) / 60,
  );
  const streak = {
    atual: user.gamificacao.streak_atual,
    maior: user.gamificacao.streak_maior,
  };
  const level = xpLevelFromTotal(user.gamificacao.nivel_xp);

  const weeklyHistories = workouts.filter((h) => new Date(h.concluido_em) >= since);
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

  const ciclosSemana = weeklyTreinoTypes(workouts, weekStart);
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
  if ((user.gamificacao.streak_congelamentos?.length ?? 0) >= 10) unlocked.add('freeze_streak_10x');
  if (level >= 15) unlocked.add('nivel_15');
  if (level >= 20) unlocked.add('nivel_20');
  if (user.gamificacao.nivel_xp >= 10_000) unlocked.add('xp_10000');
  if (user.gamificacao.nivel_xp >= 25_000) unlocked.add('xp_25000');
  if (totalWorkouts >= 200) unlocked.add('treinos_200');
  if (totalMinutes >= 1000) unlocked.add('minutos_1000');
  if (totalExercises >= 1000) unlocked.add('exercicios_1000');

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

  const dayKeys = await ActiveDays.listDayKeys(userId);

  const workoutSeconds = histories
    .filter((h) => !isActivityHistoryRow(h))
    .reduce((sum, h) => sum + (h.duracao_total_segundos ?? 0), 0);
  const totalSeconds = workoutSeconds;

  applyStreakFreezeProtection(user, dayKeys);

  const frozenDates = user.gamificacao.streak_congelamentos ?? [];
  const streakAfterFreeze = computeStreakFromDayKeys(dayKeys, frozenDates);
  const recovered = applyStreakRecoveryAnchor(
    user.gamificacao.streak_recovery_anchor,
    [...dayKeys, ...frozenDates],
    getTodaySaoPaulo(),
  );
  if (!recovered.active) user.gamificacao.streak_recovery_anchor = null;
  const persistedStreak = recovered.active
    ? Math.max(streakAfterFreeze.atual, recovered.streak)
    : streakAfterFreeze.atual;

  const previousStreak = user.gamificacao.streak_atual;
  user.gamificacao.total_minutos = Math.floor(totalSeconds / 60);
  user.gamificacao.streak_atual = persistedStreak;
  user.gamificacao.streak_maior = Math.max(
    user.gamificacao.streak_maior,
    streakAfterFreeze.maior,
    persistedStreak,
  );
  const conquistasAntes = new Set(user.gamificacao.conquistas);
  const atividadesTotal = await ActivityLogs.count(userId);
  user.gamificacao.conquistas = evaluateAchievementsFromHistories(user, histories, atividadesTotal);
  // Ordem de desbloqueio (mais recente por último) — só pra saber "quais são
  // as últimas 3" no preview do Início; `evaluateAchievementsFromHistories`
  // é cumulativo (nunca remove), então o que é novo aqui é o que acabou de
  // desbloquear nesta sincronização.
  const novasConquistas = user.gamificacao.conquistas.filter((id) => !conquistasAntes.has(id));
  if (novasConquistas.length > 0) {
    const ordemAnterior = (user.gamificacao.conquistas_ordem ?? []).filter(
      (id) => !novasConquistas.includes(id),
    );
    user.gamificacao.conquistas_ordem = [...ordemAnterior, ...novasConquistas];
  }

  const newRecoveryOffer = updateStreakRecoveryState(user, previousStreak, persistedStreak);

  // Só o que esta função altera. É um dos caminhos de escrita mais quentes do
  // app (roda em /stats, na conclusão de treino e de atividade), então salvar
  // o perfil inteiro daqui apagaria `preferencias` gravadas em paralelo pelo
  // cliente. `preferencias` aqui é apenas LIDA (frozen_streak_auto_usar).
  await user.saveColumns(['gamificacao', 'inventario', 'xp_diario']);

  // Frozen Streak: feedback visual na Home (não cria mais item na Caixa de Entrada).
  if (newRecoveryOffer) {
    await notifyStreakRecoveryAvailable(userId, newRecoveryOffer);
  }

  return user;
}

/**
 * Detecta perda REAL de streak (não coberta por Frozen Streak) e mantém o
 * sistema de "Recuperar Streak" em dia: expira a oferta ativa se o jogador já
 * reconstruiu a sequência sozinho até o mesmo tamanho, e cria uma oferta nova
 * se a conta já perdeu o streak `STREAK_RECOVERY_UNLOCK_LOSSES` vezes na vida
 * dela (contando a perda de agora). Retorna a oferta recém-criada (pra
 * disparar notificação) ou null se nada novo aconteceu.
 */
function updateStreakRecoveryState(
  user: UserRecord,
  previousStreak: number,
  newStreak: number,
): StreakRecoveryOffer | null {
  const existingOffer = user.gamificacao.streak_recovery_offer ?? null;
  if (existingOffer && newStreak >= existingOffer.dias_perdidos) {
    user.gamificacao.streak_recovery_offer = null;
  }

  // Sem perda real agora (streak continua, ou já estava zerado antes).
  if (previousStreak <= 0 || newStreak !== 0) return null;

  user.gamificacao.streak_perdas_total = (user.gamificacao.streak_perdas_total ?? 0) + 1;
  if (user.gamificacao.streak_perdas_total < STREAK_RECOVERY_UNLOCK_LOSSES) return null;

  const offer = buildStreakRecoveryOffer(previousStreak, getTodaySaoPaulo());
  if (
    (user.gamificacao.streak_recoveries ?? []).some(
      (receipt) => receipt.perdido_em === offer.perdido_em,
    )
  ) {
    return null;
  }
  user.gamificacao.streak_recovery_offer = offer;
  return offer;
}

async function notifyStreakRecoveryAvailable(
  userId: string,
  offer: StreakRecoveryOffer,
): Promise<void> {
  await Notifications.createMany([
    {
      user_id: userId,
      tipo: 'streak_recovery_available',
      titulo: 'Recupere sua sequência!',
      corpo: `Você perdeu uma sequência de ${offer.dias_perdidos} dia(s) — recupere por ${offer.custo_coins} Folhas antes que expire.`,
      payload: { dias_perdidos: offer.dias_perdidos, custo_coins: offer.custo_coins },
    },
  ]);
}

/** "Treinou hoje" = treino de verdade, não Atividades — uma sozinha nunca
    marca o treino diário como concluído (ele sustenta a streak, mas não
    "completa" o card de treino; só um treino de verdade faz isso). */
export function hasTrainedToday(userId: string): Promise<boolean> {
  const todayStart = startOfDaySaoPaulo();
  const tomorrow = endOfDaySaoPaulo();

  return WorkoutHistory.exists({
    usuario_id: userId,
    concluido_em: { $gte: todayStart.toISOString(), $lt: tomorrow.toISOString() },
    somenteTreino: true,
  });
}

/** A sequência de hoje já está garantida? Ao contrário de `hasTrainedToday`,
    aqui QUALQUER entrada do dia conta (treino ou Atividade), porque é
    exatamente isso que sustenta a streak. Existe separado porque os dois
    respondem perguntas diferentes: "o treino foi concluído?" e "o
    dia já está pago?" — usar o primeiro pelo segundo fazia o contador
    regressivo alarmar "pra manter a sequência" com o dia já garantido por
    atividades. */
export async function hasStreakSecuredToday(userId: string): Promise<boolean> {
  return ActiveDays.has(userId, getTodaySaoPaulo());
}
