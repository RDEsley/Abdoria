import { getTodaySaoPaulo } from '../../utils/timezone.js';
import { User, sanitizeUser } from '../../domain/User.js';
import { awardDailyXp } from '../economy.js';
import { awardMoedaFromXpProgress, syncShopUnlocks } from '../shop.js';
import { syncUserGamification } from '../gamification.js';
import { recordValidDailyAction } from '../active-day.js';
import { Activities, ActivityLogs, Routines } from '../../repositories/activities-repository.js';
import {
  computeActivityReward,
  computeRoutineBonusXp,
  type ActivityLogKind,
} from '../../../../shared/activities/index.js';
import { xpLevelFromTotal } from '../../types/index.js';

export interface CompleteActivityInput {
  activityId: string;
  clientCompletionId: string;
  kind?: ActivityLogKind;
  metrics?: Record<string, unknown>;
  note?: string;
  occurrenceKey?: string;
  routineId?: string;
  durationMin?: number;
  value?: number;
  source?: 'quick' | 'routine';
}

export async function completeActivity(userId: string, input: CompleteActivityInput) {
  const activity = await Activities.findById(userId, input.activityId);
  if (!activity || activity.archived_at) {
    throw Object.assign(new Error('Atividade não encontrada.'), { status: 404 });
  }

  const existing = await ActivityLogs.findByClientCompletion(userId, input.clientCompletionId);
  if (existing) {
    const user = await User.findById(userId);
    return {
      duplicate: true,
      log: existing,
      user: user ? sanitizeUser(user) : null,
      xp_ganho: 0,
      abdoria_ganha: 0,
      streak_celebration: null,
      level_up: null,
      new_achievements: [] as string[],
      routine_bonus_xp: 0,
    };
  }

  const now = new Date();
  const dayKey = getTodaySaoPaulo(now);
  const kind: ActivityLogKind = input.kind === 'minimum' ? 'minimum' : 'full';
  const alreadyCompletedToday = await ActivityLogs.hasActivityOnDay(userId, activity.id, dayKey);
  const distinctXp = await ActivityLogs.distinctXpActivitiesOnDay(userId, dayKey);
  const reward = computeActivityReward({
    kind,
    alreadyCompletedToday,
    distinctXpActivitiesToday: distinctXp,
  });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404 });

  const prevAchievements = new Set(user.gamificacao.conquistas);
  const streakBefore = user.gamificacao.streak_atual;
  const levelBefore = xpLevelFromTotal(user.gamificacao.nivel_xp);

  const source = kind === 'minimum' ? 'activity_minimum_completed' : 'activity_completed';
  await recordValidDailyAction(userId, source, now);

  const metrics: Record<string, unknown> = { ...(input.metrics ?? {}) };
  let routineBonus = 0;
  if (input.routineId) {
    const routine = await Routines.findById(userId, input.routineId);
    if (routine?.items?.length) {
      const done = await ActivityLogs.activityIdsDoneOnDay(userId, dayKey);
      done.add(activity.id);
      const allDone = routine.items.every((item) => done.has(item.activity_id));
      if (allDone) {
        const alreadyBonus = await ActivityLogs.hasRoutineBonusOnDay(userId, routine.id, dayKey);
        routineBonus = computeRoutineBonusXp(alreadyBonus);
        if (routineBonus > 0) metrics.routine_bonus_xp = routineBonus;
        await recordValidDailyAction(userId, 'routine_completed', now);
      }
    }
  }

  const xpAwarded = awardDailyXp(user, reward.xp + routineBonus);
  const levelAfter = xpLevelFromTotal(user.gamificacao.nivel_xp);
  const abdoriaGanha = xpAwarded > 0 ? awardMoedaFromXpProgress(user) : 0;
  syncShopUnlocks(user);
  await user.saveColumns(['gamificacao', 'xp_diario', 'cosmeticos']);

  const log = await ActivityLogs.insert({
    user_id: userId,
    activity_id: activity.id,
    activity_name_snapshot: activity.name,
    routine_id: input.routineId ?? null,
    day_key: dayKey,
    completed_at: now.toISOString(),
    kind,
    occurrence_key: input.occurrenceKey ?? dayKey,
    client_completion_id: input.clientCompletionId,
    metrics,
    note: input.note ?? null,
    duration_min: input.durationMin ?? null,
    value: input.value ?? null,
    xp_awarded: xpAwarded,
    leaves_awarded: 0,
    source: input.source ?? (input.routineId ? 'routine' : 'quick'),
  });

  const updated = await syncUserGamification(userId);
  const streakAfter = updated?.gamificacao.streak_atual ?? user.gamificacao.streak_atual;
  const newAchievements = (updated?.gamificacao.conquistas ?? []).filter(
    (id) => !prevAchievements.has(id),
  );

  return {
    duplicate: false,
    log,
    user: updated ? sanitizeUser(updated) : sanitizeUser(user),
    xp_ganho: xpAwarded,
    abdoria_ganha: abdoriaGanha,
    streak_celebration:
      streakAfter > streakBefore
        ? { streak_atual: streakAfter, streak_anterior: streakBefore }
        : null,
    level_up:
      levelAfter > levelBefore ? { level_anterior: levelBefore, level_novo: levelAfter } : null,
    new_achievements: newAchievements,
    routine_bonus_xp: routineBonus,
    first_of_day: reward.firstOfDay,
  };
}
