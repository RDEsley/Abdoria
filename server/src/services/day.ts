import { addDaysSaoPaulo, getTodaySaoPaulo, startOfDayKeySaoPaulo } from '../utils/timezone.js';
import { User } from '../domain/User.js';
import { hasTrainedToday } from './gamification.js';
import { getSuggestedWorkout } from './recommendation.js';
import { ActiveDays } from '../repositories/active-days-repository.js';
import { Activities, ActivityLogs, Routines } from '../repositories/activities-repository.js';
import { WorkoutHistory } from '../repositories/workout-history-repository.js';
import { plannedOccurrencesForDay } from '../../../shared/activities/index.js';
import { buildDeterministicInsights } from '../../../shared/activities/insights.js';
import { periodFromHour } from '../../../shared/activities/schedule.js';
import type { QuestContext } from '../../../shared/quests/catalog.js';

export async function getDaySnapshot(userId: string) {
  const today = getTodaySaoPaulo();
  const weekStart = addDaysSaoPaulo(today, -6);
  const twoWeeksStart = addDaysSaoPaulo(today, -13);
  const monthStart = addDaysSaoPaulo(today, -29);

  const twoWeeksFromIso = startOfDayKeySaoPaulo(twoWeeksStart).toISOString();
  const weekToIso = startOfDayKeySaoPaulo(addDaysSaoPaulo(today, 1)).toISOString();

  const [
    user,
    activities,
    routines,
    logs,
    treinoHoje,
    diaAtivo,
    twoWeekDays,
    days30,
    twoWeekWorkouts,
  ] = await Promise.all([
    User.findById(userId),
    Activities.list(userId),
    Routines.list(userId),
    ActivityLogs.list(userId, { from: monthStart, to: today }),
    hasTrainedToday(userId),
    ActiveDays.has(userId, today),
    ActiveDays.listSince(userId, twoWeeksStart),
    ActiveDays.countSince(userId, monthStart),
    WorkoutHistory.find({
      usuario_id: userId,
      concluido_em: { $gte: twoWeeksFromIso, $lt: weekToIso },
      somenteTreino: true,
    }),
  ]);

  // Split into current and previous week
  const weekDays = twoWeekDays.filter((d) => d.day_key >= weekStart);
  const prevWeekDays = twoWeekDays.filter((d) => d.day_key < weekStart);
  const weekWorkouts = twoWeekWorkouts.filter(
    (w) => getTodaySaoPaulo(new Date(w.concluido_em)) >= weekStart,
  );
  const prevWeekWorkouts = twoWeekWorkouts.filter(
    (w) => getTodaySaoPaulo(new Date(w.concluido_em)) < weekStart,
  );

  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404 });

  const todayLogs = logs.filter((log) => log.day_key === today);
  const occurrences = plannedOccurrencesForDay(activities, today, todayLogs);
  const doneIds = new Set(todayLogs.map((log) => log.activity_id).filter(Boolean));

  const routineSnapshots = routines.map((routine) => {
    const items = routine.items ?? [];
    const itemsDone = items.filter((item) => doneIds.has(item.activity_id)).length;
    return {
      id: routine.id,
      name: routine.name,
      icon: routine.icon,
      color: routine.color,
      items_total: items.length,
      items_done: itemsDone,
    };
  });

  const nextUp: Array<{ kind: 'workout' | 'activity' | 'routine'; title: string; href: string }> =
    [];
  if (!treinoHoje) {
    const suggested = await getSuggestedWorkout(user);
    nextUp.push({
      kind: 'workout',
      title: suggested?.nome ?? 'Treino do dia',
      href: '/treino',
    });
  }
  const pending = occurrences.find((item) => item.status === 'pending');
  if (pending) {
    nextUp.push({ kind: 'activity', title: pending.name, href: '/atividades' });
  }
  const pendingRoutine = routineSnapshots.find(
    (routine) => routine.items_done < routine.items_total,
  );
  if (pendingRoutine) {
    nextUp.push({
      kind: 'routine',
      title: pendingRoutine.name,
      href: `/rotina/${pendingRoutine.id}`,
    });
  }

  const weekKeys = Array.from({ length: 7 }, (_, index) => addDaysSaoPaulo(weekStart, index));
  const activeSet = new Set(weekDays.map((day) => day.day_key));
  const frozen = new Set(user.gamificacao.streak_congelamentos ?? []);
  const workoutsByDay = new Map<string, { count: number; xp: number }>();
  for (const history of weekWorkouts) {
    const dayKey = getTodaySaoPaulo(new Date(history.concluido_em));
    const bucket = workoutsByDay.get(dayKey) ?? { count: 0, xp: 0 };
    bucket.count += 1;
    bucket.xp += Number(history.xp_ganho ?? 0);
    workoutsByDay.set(dayKey, bucket);
  }
  const week = weekKeys.map((dayKey) => {
    const dayLogs = logs.filter((log) => log.day_key === dayKey);
    const workouts = workoutsByDay.get(dayKey);
    return {
      day_key: dayKey,
      active: activeSet.has(dayKey),
      workouts: workouts?.count ?? 0,
      activities: dayLogs.length,
      xp: dayLogs.reduce((sum, log) => sum + log.xp_awarded, 0) + (workouts?.xp ?? 0),
      frozen: frozen.has(dayKey) && !activeSet.has(dayKey),
    };
  });

  const insights = buildDeterministicInsights({
    todayKey: today,
    activities: activities.map((activity) => ({ id: activity.id, name: activity.name })),
    logs,
    activeDayKeys: weekDays.map((day) => day.day_key),
  });

  // Momentum: per-period progress
  const periodBuckets = {
    manha: { planned: 0, done: 0 },
    tarde: { planned: 0, done: 0 },
    noite: { planned: 0, done: 0 },
  };
  for (const occ of occurrences) {
    const h = occ.time ? parseInt(occ.time.split(':')[0], 10) : null;
    const p = h != null ? periodFromHour(h) : null;
    if (p) {
      periodBuckets[p].planned += 1;
      if (occ.status === 'done') periodBuckets[p].done += 1;
    }
  }
  const currentHour = new Date().getHours();
  const currentPeriod = periodFromHour(currentHour);

  return {
    day_key: today,
    dia_ativo_garantido: diaAtivo,
    streak_atual: user.gamificacao.streak_atual,
    streak_maior: user.gamificacao.streak_maior,
    xp_hoje: user.xp_diario?.ganho_hoje ?? 0,
    treino_hoje: treinoHoje,
    occurrences,
    routines: routineSnapshots,
    next_up: nextUp,
    week,
    dias_ativos_30: days30,
    insight: insights[0] ?? null,
    momentum: {
      current_period: currentPeriod,
      periods: periodBuckets,
    },
    week_retro: buildWeekRetro(
      weekDays,
      prevWeekDays,
      weekWorkouts,
      prevWeekWorkouts,
      logs,
      weekStart,
    ),
  };
}

function buildWeekRetro(
  weekDays: Array<{ day_key: string }>,
  prevWeekDays: Array<{ day_key: string }>,
  weekWorkouts: unknown[],
  prevWeekWorkouts: unknown[],
  logs: Array<{ day_key: string; activity_id?: string | null; xp_awarded: number }>,
  weekStart: string,
) {
  if (prevWeekDays.length === 0 && prevWeekWorkouts.length === 0) return null;

  const weekLogs = logs.filter((l) => l.day_key >= weekStart);
  const prevLogs = logs.filter((l) => l.day_key < weekStart);
  const weekXp = weekLogs.reduce((s, l) => s + l.xp_awarded, 0);
  const prevXp = prevLogs.reduce((s, l) => s + l.xp_awarded, 0);

  // Best day
  const dayXp = new Map<string, number>();
  for (const log of weekLogs) {
    dayXp.set(log.day_key, (dayXp.get(log.day_key) ?? 0) + log.xp_awarded);
  }
  let bestDay: string | null = null;
  let bestDayXp = 0;
  for (const [day, xp] of dayXp) {
    if (xp > bestDayXp) {
      bestDay = day;
      bestDayXp = xp;
    }
  }

  return {
    active_days: weekDays.length,
    active_days_prev: prevWeekDays.length,
    workouts: weekWorkouts.length,
    workouts_prev: prevWeekWorkouts.length,
    activities: weekLogs.length,
    activities_prev: prevLogs.length,
    xp: weekXp,
    xp_prev: prevXp,
    best_day: bestDay,
    best_day_xp: bestDayXp,
  };
}

export async function getInsightsForUser(userId: string) {
  const today = getTodaySaoPaulo();
  const from = addDaysSaoPaulo(today, -29);
  const [activities, logs, days] = await Promise.all([
    Activities.list(userId),
    ActivityLogs.list(userId, { from, to: today }),
    ActiveDays.listSince(userId, from),
  ]);
  return buildDeterministicInsights({
    todayKey: today,
    activities: activities.map((activity) => ({ id: activity.id, name: activity.name })),
    logs,
    activeDayKeys: days.map((day) => day.day_key),
  });
}

export async function buildQuestContext(userId: string): Promise<QuestContext> {
  const today = getTodaySaoPaulo();
  const weekStart = addDaysSaoPaulo(today, -6);
  const weekFromIso = startOfDayKeySaoPaulo(weekStart).toISOString();
  const weekToIso = startOfDayKeySaoPaulo(addDaysSaoPaulo(today, 1)).toISOString();

  const [activities, logs, treinoHoje, weekDays, weekWorkouts] = await Promise.all([
    Activities.list(userId),
    ActivityLogs.list(userId, { from: today, to: today }),
    hasTrainedToday(userId),
    ActiveDays.listSince(userId, weekStart),
    WorkoutHistory.find({
      usuario_id: userId,
      concluido_em: { $gte: weekFromIso, $lt: weekToIso },
      somenteTreino: true,
    }),
  ]);

  const todayLogs = logs.filter((l) => l.day_key === today);
  const occurrences = plannedOccurrencesForDay(activities, today, todayLogs);
  const doneLogs = todayLogs.filter((l) => l.activity_id);

  const periodOccurrences = {
    manha: [] as typeof occurrences,
    tarde: [] as typeof occurrences,
    noite: [] as typeof occurrences,
  };
  for (const occ of occurrences) {
    const h = occ.time ? parseInt(occ.time.split(':')[0], 10) : null;
    const p = h != null ? periodFromHour(h) : null;
    if (p) periodOccurrences[p].push(occ);
  }

  const morningComplete =
    periodOccurrences.manha.length > 0 && periodOccurrences.manha.every((o) => o.status === 'done');
  const afternoonComplete =
    periodOccurrences.tarde.length > 0 && periodOccurrences.tarde.every((o) => o.status === 'done');
  const eveningComplete =
    periodOccurrences.noite.length > 0 && periodOccurrences.noite.every((o) => o.status === 'done');

  return {
    activitiesCompletedToday: doneLogs.length,
    morningComplete,
    afternoonComplete,
    eveningComplete,
    trainedToday: treinoHoje,
    activeDaysThisWeek: weekDays.length,
    workoutsThisWeek: weekWorkouts.length,
    streakAtual: 0, // Will be filled from user if needed
  };
}
