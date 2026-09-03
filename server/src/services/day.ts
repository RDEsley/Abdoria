import { addDaysSaoPaulo, getTodaySaoPaulo, startOfDayKeySaoPaulo } from '../utils/timezone.js';
import { User } from '../domain/User.js';
import { hasTrainedToday } from './gamification.js';
import { getSuggestedWorkout } from './recommendation.js';
import { ActiveDays } from '../repositories/active-days-repository.js';
import { Activities, ActivityLogs, Routines } from '../repositories/activities-repository.js';
import { WorkoutHistory } from '../repositories/workout-history-repository.js';
import { plannedOccurrencesForDay } from '../../../shared/activities/index.js';
import { buildDeterministicInsights } from '../../../shared/activities/insights.js';

export async function getDaySnapshot(userId: string) {
  const today = getTodaySaoPaulo();
  const weekStart = addDaysSaoPaulo(today, -6);
  const monthStart = addDaysSaoPaulo(today, -29);

  const weekFromIso = startOfDayKeySaoPaulo(weekStart).toISOString();
  const weekToIso = startOfDayKeySaoPaulo(addDaysSaoPaulo(today, 1)).toISOString();

  const [user, activities, routines, logs, treinoHoje, diaAtivo, weekDays, days30, weekWorkouts] =
    await Promise.all([
      User.findById(userId),
      Activities.list(userId),
      Routines.list(userId),
      ActivityLogs.list(userId, { from: monthStart, to: today }),
      hasTrainedToday(userId),
      ActiveDays.has(userId, today),
      ActiveDays.listSince(userId, weekStart),
      ActiveDays.countSince(userId, monthStart),
      WorkoutHistory.find({
        usuario_id: userId,
        concluido_em: { $gte: weekFromIso, $lt: weekToIso },
        somenteTreino: true,
      }),
    ]);

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
