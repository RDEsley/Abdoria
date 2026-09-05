import {
  addDaysSaoPaulo,
  getHourSaoPaulo,
  getSaoPauloWeekday,
  getTodaySaoPaulo,
  getWeekStartSaoPaulo,
  startOfDayKeySaoPaulo,
} from '../utils/timezone.js';
import { User } from '../domain/User.js';
import { hasTrainedToday } from './gamification.js';
import { getSuggestedWorkout } from './recommendation.js';
import { ActiveDays } from '../repositories/active-days-repository.js';
import { Activities, ActivityLogs, Routines } from '../repositories/activities-repository.js';
import { WorkoutHistory } from '../repositories/workout-history-repository.js';
import {
  activityOccursOnDay,
  buildDayGuide,
  filterAvailableRoutineItems,
  isRoutineFullyRunnable,
  plannedOccurrencesForDay,
  resolveRoutineHealth,
  routineHasAvailableItems,
  routineItemsDoneToday,
  type DayGuideItem,
  type DayGuideQuestInput,
} from '../../../shared/activities/index.js';
import { buildDeterministicInsights } from '../../../shared/activities/insights.js';
import { periodFromHour } from '../../../shared/activities/schedule.js';
import { selectQuestsForUser, type QuestContext } from '../../../shared/quests/catalog.js';
import { FoodLogs, NutritionProfiles } from '../repositories/nutrition-repository.js';

function emptyCategories(): Set<string> {
  return new Set();
}

function baseQuestContext(partial: Partial<QuestContext>): QuestContext {
  return {
    activitiesCompletedToday: 0,
    activitiesCompletedThisWeek: 0,
    activitiesCompletedThisMonth: 0,
    routinesCompletedToday: 0,
    routinesCompletedThisWeek: 0,
    routinesCompletedThisMonth: 0,
    scheduledActivityCompletedToday: 0,
    scheduledRoutineCompletedToday: 0,
    morningComplete: false,
    afternoonComplete: false,
    eveningComplete: false,
    trainedToday: false,
    trainingDayToday: false,
    weeklyTrainingDays: 0,
    activeDaysThisWeek: 0,
    activeDaysThisMonth: 0,
    workoutsThisWeek: 0,
    workoutsThisMonth: 0,
    hasRoutines: false,
    hasRoutineScheduledToday: false,
    hasActivities: false,
    hasScheduledActivityToday: false,
    categoriesToday: emptyCategories(),
    categoriesUsed: emptyCategories(),
    menteCompletedToday: 0,
    corpoCompletedToday: 0,
    vidaCompletedToday: 0,
    distinctCategoriesThisWeek: 0,
    daysRemainingInMonth: 30,
    dayOfMonth: 1,
    streakAtual: 0,
    nutritionSetup: false,
    mealsLoggedToday: 0,
    nutritionDaysThisWeek: 0,
    nutritionDaysThisMonth: 0,
    recipesLoggedThisWeek: 0,
    ...partial,
  };
}

export async function getDaySnapshot(userId: string) {
  const today = getTodaySaoPaulo();
  // Rolling 7-day window ending today — used only by the WeekStrip ("week").
  const weekStart = addDaysSaoPaulo(today, -6);
  // Civil Monday–Sunday week (America/Sao_Paulo) — used only by "week_retro".
  const civilWeekStart = getWeekStartSaoPaulo();
  const civilWeekEnd = addDaysSaoPaulo(civilWeekStart, 6);
  const prevCivilWeekStart = addDaysSaoPaulo(civilWeekStart, -7);
  const prevCivilWeekEnd = addDaysSaoPaulo(civilWeekStart, -1);
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

  // Rolling window split (today-6..today) — feeds the WeekStrip only.
  const weekDays = twoWeekDays.filter((d) => d.day_key >= weekStart);
  const weekWorkouts = twoWeekWorkouts.filter(
    (w) => getTodaySaoPaulo(new Date(w.concluido_em)) >= weekStart,
  );

  // Civil Mon–Sun split — feeds week_retro only (independent from the WeekStrip).
  const civilWeekDays = twoWeekDays.filter((d) => d.day_key >= civilWeekStart);
  const prevCivilWeekDays = twoWeekDays.filter(
    (d) => d.day_key >= prevCivilWeekStart && d.day_key <= prevCivilWeekEnd,
  );
  const civilWeekWorkouts = twoWeekWorkouts.filter(
    (w) => getTodaySaoPaulo(new Date(w.concluido_em)) >= civilWeekStart,
  );
  const prevCivilWeekWorkouts = twoWeekWorkouts.filter((w) => {
    const dayKey = getTodaySaoPaulo(new Date(w.concluido_em));
    return dayKey >= prevCivilWeekStart && dayKey <= prevCivilWeekEnd;
  });

  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404 });

  const todayLogs = logs.filter((log) => log.day_key === today);
  const occurrences = plannedOccurrencesForDay(activities, today, todayLogs);
  const doneIds = new Set(todayLogs.map((log) => log.activity_id).filter(Boolean));

  // Momentum: per-period progress (also feeds the quest context below).
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
  const currentHour = getHourSaoPaulo();
  const currentPeriod = periodFromHour(currentHour);

  const liveActivityIds = new Set(activities.map((activity) => activity.id));

  // items_done is isolated per routine: a log only counts toward a routine's
  // progress when it was recorded through that exact routine_id, so the same
  // activity shared by two routines (or completed standalone) never silently
  // marks the other routine's item as done.
  // Contagem usa só Activities ainda disponíveis (arquivadas não incham o total).
  const routineSnapshots = routines.map((routine) => {
    const health = resolveRoutineHealth(routine, liveActivityIds);
    const aliveItems = filterAvailableRoutineItems(routine.items, liveActivityIds);
    const itemsDone = routineItemsDoneToday(
      { id: routine.id, items: aliveItems },
      todayLogs,
    );
    return {
      id: routine.id,
      name: routine.name,
      icon: routine.icon,
      color: routine.color,
      items_total: health.availableItems,
      items_done: itemsDone,
      health: health.state,
      scheduled_today:
        routine.schedule.kind !== 'unscheduled' && activityOccursOnDay(routine.schedule, today),
      schedule: routine.schedule,
    };
  });

  const runnableRoutines = routines.filter((routine) =>
    isRoutineFullyRunnable(resolveRoutineHealth(routine, liveActivityIds)),
  );
  const routinesWithLife = routines.filter((routine) =>
    routineHasAvailableItems(resolveRoutineHealth(routine, liveActivityIds)),
  );

  const suggestedWorkout = treinoHoje ? null : await getSuggestedWorkout(user);

  // Quest progress is derived from data already fetched above (no extra
  // queries) so the Day Guide can consider a near-complete quest as a hint.
  const trainingDays = user.ab_training_profile_v2?.training_days ?? [];
  const weekday = getSaoPauloWeekday();
  const categoriesUsed = new Set(
    activities.map((activity) => activity.category).filter(Boolean) as string[],
  );
  const questContextForGuide = baseQuestContext({
    activitiesCompletedToday: doneIds.size,
    scheduledActivityCompletedToday: occurrences.filter(
      (occ) => Boolean(occ.time) && occ.status === 'done',
    ).length,
    scheduledRoutineCompletedToday: routineSnapshots.filter(
      (routine) =>
        routine.scheduled_today &&
        routine.items_total > 0 &&
        routine.items_done >= routine.items_total,
    ).length,
    morningComplete:
      periodBuckets.manha.planned > 0 && periodBuckets.manha.done === periodBuckets.manha.planned,
    afternoonComplete:
      periodBuckets.tarde.planned > 0 && periodBuckets.tarde.done === periodBuckets.tarde.planned,
    eveningComplete:
      periodBuckets.noite.planned > 0 && periodBuckets.noite.done === periodBuckets.noite.planned,
    trainedToday: treinoHoje,
    trainingDayToday: trainingDays.includes(weekday),
    weeklyTrainingDays: trainingDays.length,
    activeDaysThisWeek: weekDays.length,
    workoutsThisWeek: weekWorkouts.length,
    hasRoutines: routinesWithLife.length > 0,
    hasRoutineScheduledToday: routineSnapshots.some(
      (routine) => routine.scheduled_today && routine.items_total > 0,
    ),
    hasActivities: activities.length > 0,
    hasScheduledActivityToday: occurrences.some((occ) => Boolean(occ.time)),
    categoriesUsed,
    streakAtual: user.gamificacao.streak_atual,
    dayOfMonth: Number(today.slice(8)),
    daysRemainingInMonth: (() => {
      const [y, m] = today.split('-').map(Number);
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return Math.max(0, last - Number(today.slice(8)));
    })(),
  });
  const questProgressForGuide: DayGuideQuestInput[] = selectQuestsForUser(
    userId,
    questContextForGuide,
  ).map((quest) => ({
    id: quest.id,
    title: quest.title,
    progress: quest.progress(questContextForGuide),
    goal: quest.goal,
  }));

  const guide = buildDayGuide({
    todayKey: today,
    trainedToday: treinoHoje,
    suggestedWorkoutTitle: suggestedWorkout?.nome ?? null,
    routines: runnableRoutines.map((routine) => ({
      id: routine.id,
      name: routine.name,
      schedule: routine.schedule,
      items: filterAvailableRoutineItems(routine.items, liveActivityIds),
    })),
    todayLogs: todayLogs.map((log) => ({
      routine_id: log.routine_id,
      activity_id: log.activity_id,
    })),
    occurrences,
    quests: questProgressForGuide,
    weeklyReviewAvailable: prevCivilWeekDays.length > 0 || prevCivilWeekWorkouts.length > 0,
  });
  const stripScore = ({ score: _score, ...rest }: DayGuideItem) => rest;
  const nextUp = guide.secondary
    ? [stripScore(guide.primary), stripScore(guide.secondary)]
    : [stripScore(guide.primary)];

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
    // Civil Mon–Sun retro, independent of the rolling WeekStrip above.
    week_retro: buildWeekRetro(
      civilWeekDays,
      prevCivilWeekDays,
      civilWeekWorkouts,
      prevCivilWeekWorkouts,
      logs,
      civilWeekStart,
      civilWeekEnd,
      prevCivilWeekStart,
      prevCivilWeekEnd,
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
  weekEnd: string,
  prevWeekStart: string,
  prevWeekEnd: string,
) {
  if (prevWeekDays.length === 0 && prevWeekWorkouts.length === 0) return null;

  const weekLogs = logs.filter((l) => l.day_key >= weekStart && l.day_key <= weekEnd);
  const prevLogs = logs.filter((l) => l.day_key >= prevWeekStart && l.day_key <= prevWeekEnd);
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
  const weekStart = getWeekStartSaoPaulo();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [y, m] = today.split('-').map(Number);
  const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dayOfMonth = Number(today.slice(8));
  const daysRemainingInMonth = Math.max(0, lastDayOfMonth - dayOfMonth);

  const weekFromIso = startOfDayKeySaoPaulo(weekStart).toISOString();
  const monthFromIso = startOfDayKeySaoPaulo(monthStart).toISOString();
  const tomorrowIso = startOfDayKeySaoPaulo(addDaysSaoPaulo(today, 1)).toISOString();

  const [user, activities, routines, logs, treinoHoje, weekDays, monthDays, weekWorkouts, monthWorkouts, nutritionProfile, foodLogsMonth] =
    await Promise.all([
      User.findById(userId),
      Activities.list(userId),
      Routines.list(userId),
      ActivityLogs.list(userId, { from: monthStart, to: today }),
      hasTrainedToday(userId),
      ActiveDays.listSince(userId, weekStart),
      ActiveDays.listSince(userId, monthStart),
      WorkoutHistory.find({
        usuario_id: userId,
        concluido_em: { $gte: weekFromIso, $lt: tomorrowIso },
        somenteTreino: true,
      }),
      WorkoutHistory.find({
        usuario_id: userId,
        concluido_em: { $gte: monthFromIso, $lt: tomorrowIso },
        somenteTreino: true,
      }),
      NutritionProfiles.getOrNull(userId).catch(() => null),
      FoodLogs.listBetween(userId, monthStart, today).catch(() => []),
    ]);

  const todayLogs = logs.filter((log) => log.day_key === today);
  const weekLogs = logs.filter((log) => log.day_key >= weekStart);
  const occurrences = plannedOccurrencesForDay(activities, today, todayLogs);
  const doneLogs = todayLogs.filter((log) => log.activity_id);

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

  const liveActivityIds = new Set(activities.map((activity) => activity.id));

  const countRoutineCompletions = (dayLogs: typeof logs) => {
    let count = 0;
    for (const routine of routines) {
      const items = routine.items ?? [];
      // Histórico: conta contra items persistidos (não reescreve progresso só porque
      // uma Activity foi arquivada depois). Rotinas vazias não contam.
      if (items.length === 0) continue;
      if (routineItemsDoneToday({ id: routine.id, items }, dayLogs) >= items.length) {
        count += 1;
      }
    }
    return count;
  };

  const routinesCompletedToday = countRoutineCompletions(todayLogs);
  let routinesCompletedThisWeek = 0;
  let routinesCompletedThisMonth = 0;
  const dayKeys = [...new Set(logs.map((log) => log.day_key))];
  for (const dayKey of dayKeys) {
    const dayLogs = logs.filter((log) => log.day_key === dayKey);
    const completed = countRoutineCompletions(dayLogs);
    if (dayKey >= weekStart) routinesCompletedThisWeek += completed;
    routinesCompletedThisMonth += completed;
  }

  const categoriesUsed = new Set(
    activities.map((activity) => activity.category).filter(Boolean) as string[],
  );
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  let menteCompletedToday = 0;
  let corpoCompletedToday = 0;
  let vidaCompletedToday = 0;
  const categoriesThisWeek = new Set<string>();
  for (const log of doneLogs) {
    const category = log.activity_id ? activityById.get(log.activity_id)?.category : null;
    if (category === 'mente') menteCompletedToday += 1;
    if (category === 'corpo') corpoCompletedToday += 1;
    if (category === 'vida') vidaCompletedToday += 1;
  }
  for (const log of weekLogs) {
    const category = log.activity_id ? activityById.get(log.activity_id)?.category : null;
    if (category) categoriesThisWeek.add(category);
  }

  const trainingDays = user?.ab_training_profile_v2?.training_days ?? [];
  const weekday = getSaoPauloWeekday();

  const scheduledActivityIds = new Set(
    occurrences.filter((occ) => Boolean(occ.time)).map((occ) => occ.activity_id),
  );
  const scheduledActivityCompletedToday = doneLogs.filter(
    (log) => log.activity_id && scheduledActivityIds.has(log.activity_id),
  ).length;

  const scheduledRoutinesToday = routines.filter(
    (routine) =>
      routine.schedule.kind !== 'unscheduled' &&
      activityOccursOnDay(routine.schedule, today) &&
      routineHasAvailableItems(resolveRoutineHealth(routine, liveActivityIds)),
  );
  let scheduledRoutineCompletedToday = 0;
  for (const routine of scheduledRoutinesToday) {
    const aliveItems = filterAvailableRoutineItems(routine.items, liveActivityIds);
    if (aliveItems.length === 0) continue;
    if (
      routineItemsDoneToday({ id: routine.id, items: aliveItems }, todayLogs) >= aliveItems.length
    ) {
      scheduledRoutineCompletedToday += 1;
    }
  }

  const foodToday = foodLogsMonth.filter((log) => log.day_key === today);
  const foodWeek = foodLogsMonth.filter((log) => log.day_key >= weekStart);
  const mealsLoggedToday = new Set(foodToday.map((log) => log.meal_type)).size;
  const nutritionDaysThisWeek = new Set(foodWeek.map((log) => log.day_key)).size;
  const nutritionDaysThisMonth = new Set(foodLogsMonth.map((log) => log.day_key)).size;
  const recipeEventsWeek = new Set<string>();
  for (const log of foodWeek) {
    const note = log.note ?? '';
    if (!note.startsWith('recipe:')) continue;
    const recipeId = note.slice('recipe:'.length).split(/[\s—-]/)[0] ?? '';
    if (!recipeId) continue;
    recipeEventsWeek.add(`${log.day_key}|${log.meal_type}|${recipeId}`);
  }

  return baseQuestContext({
    activitiesCompletedToday: doneLogs.length,
    activitiesCompletedThisWeek: weekLogs.filter((log) => log.activity_id).length,
    activitiesCompletedThisMonth: logs.filter((log) => log.activity_id).length,
    routinesCompletedToday,
    routinesCompletedThisWeek,
    routinesCompletedThisMonth,
    scheduledActivityCompletedToday,
    scheduledRoutineCompletedToday,
    morningComplete,
    afternoonComplete,
    eveningComplete,
    trainedToday: treinoHoje,
    trainingDayToday: trainingDays.includes(weekday),
    weeklyTrainingDays: trainingDays.length,
    activeDaysThisWeek: weekDays.length,
    activeDaysThisMonth: monthDays.length,
    workoutsThisWeek: weekWorkouts.length,
    workoutsThisMonth: monthWorkouts.length,
    hasRoutines: routines.some((routine) =>
      routineHasAvailableItems(resolveRoutineHealth(routine, liveActivityIds)),
    ),
    hasRoutineScheduledToday: scheduledRoutinesToday.length > 0,
    hasActivities: activities.length > 0,
    hasScheduledActivityToday: scheduledActivityIds.size > 0,
    categoriesUsed,
    menteCompletedToday,
    corpoCompletedToday,
    vidaCompletedToday,
    distinctCategoriesThisWeek: categoriesThisWeek.size,
    daysRemainingInMonth,
    dayOfMonth,
    streakAtual: user?.gamificacao?.streak_atual ?? 0,
    nutritionSetup: Boolean(nutritionProfile?.setup_completed_at),
    mealsLoggedToday,
    nutritionDaysThisWeek,
    nutritionDaysThisMonth,
    recipesLoggedThisWeek: recipeEventsWeek.size,
  });
}
