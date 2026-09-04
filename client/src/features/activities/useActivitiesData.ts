import { useCallback, useEffect, useRef, useState } from 'react';
import {
  archiveActivity as archiveActivityApi,
  completeActivity,
  createActivity as createActivityApi,
  createRoutine,
  listActivities,
  listActivityLogs,
  listRoutines,
  restoreActivity as restoreActivityApi,
  updateActivity as updateActivityApi,
  updateRoutine,
  archiveRoutine,
} from '@/lib/api/activities';
import { getInsights } from '@/lib/api/day';
import { emitXpEarned } from '@/lib/xp-orbs';
import { playCompleteSet } from '@/lib/sounds';
import { successHaptic } from '@/lib/platform/native-runtime';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { deriveActivityReminders } from '@shared/reminders';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { useMidnightRefresh } from '@/context/MidnightRefreshContext';
import { showGameToast } from '@/lib/game-toast';
import { emitProgressionFeedback } from '@/lib/progression-feedback';
import { getErrorMessage } from '@/lib/api-errors';
import type { ActivityLogRecord, ActivityRecord, RoutineRecord } from '@shared/activities';
import {
  insertActivityBySortOrder,
  resolveActivityCompletionFeedback,
  type EvolynInsight,
} from '@shared/activities';
import { addDaysSaoPaulo, getTodaySaoPaulo } from '@shared/utils/timezone';

export function useActivitiesData() {
  const { refresh, markStreakSecuredToday } = useApp();
  const { applyUser, user } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [insights, setInsights] = useState<EvolynInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const inFlightRef = useRef<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const today = getTodaySaoPaulo();
    const from = addDaysSaoPaulo(today, -29);
    const [nextActivities, nextRoutines, nextLogs, nextInsights] = await Promise.all([
      listActivities(),
      listRoutines(),
      listActivityLogs(from, today),
      getInsights().catch(() => []),
    ]);
    setActivities(nextActivities);
    setRoutines(nextRoutines);
    setLogs(nextLogs);
    setInsights(nextInsights);
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload()
      .catch((error) => {
        showGameToast(getErrorMessage(error, 'Não foi possível carregar suas atividades.'), {
          variant: 'error',
        });
      })
      .finally(() => setLoading(false));
  }, [reload]);

  useMidnightRefresh(() => {
    void reload();
  });

  const complete = useCallback(
    async (
      activity: ActivityRecord,
      options?: {
        kind?: 'full' | 'minimum';
        note?: string;
        metrics?: Record<string, unknown>;
        routineId?: string;
        /** Caller (ex.: RoutineRunner) emite XP/som/toast — não duplicar aqui. */
        silentFeedback?: boolean;
        /** UI já deu haptic imediato (swipe/check/rotina); ainda emite XP/som/toast. */
        suppressHaptic?: boolean;
        /** Quando true, o caller já aplicou UI otimista (ex.: swipe). */
        optimisticUi?: boolean;
      },
    ) => {
      if (inFlightRef.current.has(activity.id)) return null;
      inFlightRef.current.add(activity.id);
      setBusyIds((prev) => new Set(prev).add(activity.id));

      const today = getTodaySaoPaulo();
      const optimisticKey = `optimistic:${activity.id}:${today}`;
      if (options?.optimisticUi) {
        setLogs((prev) => {
          if (
            prev.some(
              (entry) =>
                entry.activity_id === activity.id &&
                entry.day_key === today &&
                !entry.routine_id,
            )
          ) {
            return prev;
          }
          const optimistic: ActivityLogRecord = {
            id: optimisticKey,
            user_id: user?.id ?? '',
            activity_id: activity.id,
            activity_name_snapshot: activity.name,
            routine_id: null,
            day_key: today,
            completed_at: new Date().toISOString(),
            kind: options.kind ?? 'full',
            occurrence_key: today,
            client_completion_id: optimisticKey,
            metrics: options.metrics ?? {},
            note: options.note ?? null,
            duration_min: null,
            value: null,
            xp_awarded: 0,
            leaves_awarded: 0,
            source: 'quick',
            legacy_history_id: null,
          };
          return [optimistic, ...prev];
        });
      }

      try {
        const result = await completeActivity(activity.id, {
          client_completion_id: crypto.randomUUID(),
          kind: options?.kind ?? 'full',
          note: options?.note,
          metrics: options?.metrics,
          routine_id: options?.routineId,
        });
        applyUser(result.user);
        markStreakSecuredToday(result.user);

        if (result.log) {
          setLogs((prev) => {
            const withoutOptimistic = prev.filter((entry) => entry.id !== optimisticKey);
            if (withoutOptimistic.some((entry) => entry.id === result.log.id)) {
              return withoutOptimistic;
            }
            return [result.log, ...withoutOptimistic];
          });
        }

        const feedback = resolveActivityCompletionFeedback(options);
        if (feedback.emitHaptic) {
          void successHaptic();
        }
        if (feedback.emitXpSoundToast) {
          emitXpEarned(result.xp_ganho);
          playCompleteSet();
          const ganho = result.xp_ganho > 0 ? `+${result.xp_ganho} XP` : 'Registrado';
          showGameToast(`${activity.name}: ${ganho}`, { variant: 'success' });
        }

        emitProgressionFeedback({
          level_up: result.level_up,
          new_achievements: result.new_achievements,
          streak_celebration: result.streak_celebration,
          userId: user?.id,
        });

        const derived = deriveActivityReminders([activity], []);
        for (const reminder of derived) {
          void notificationScheduler.cancel(reminder.id);
        }
        if (options?.routineId) {
          const routine = routines.find((entry) => entry.id === options.routineId);
          const item = routine?.items?.find((entry) => entry.activity_id === activity.id);
          if (item?.reminder_enabled && item.scheduled_time) {
            void notificationScheduler.cancel(
              `routine-item:${routine!.id}:${activity.id}:${item.scheduled_time}`,
            );
          }
        }

        window.dispatchEvent(new Event('evolyn:quests-changed'));
        void reload().catch(() => undefined);
        void refresh();

        return result;
      } catch (error) {
        if (options?.optimisticUi) {
          setLogs((prev) => prev.filter((entry) => entry.id !== optimisticKey));
        }
        showGameToast(getErrorMessage(error, 'Não foi possível registrar.'), { variant: 'error' });
        return null;
      } finally {
        inFlightRef.current.delete(activity.id);
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(activity.id);
          return next;
        });
      }
    },
    [applyUser, markStreakSecuredToday, refresh, reload, routines, user],
  );

  const createActivity = useCallback(
    async (body: Record<string, unknown>) => {
      const created = await createActivityApi(body);
      setActivities((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      void reload().catch(() => undefined);
      return created;
    },
    [reload],
  );

  const updateActivity = useCallback(async (id: string, body: Record<string, unknown>) => {
    const updated = await updateActivityApi(id, body);
    setActivities((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const archiveActivity = useCallback(async (id: string) => {
    let snapshot: ActivityRecord | undefined;
    setActivities((prev) => {
      snapshot = prev.find((item) => item.id === id);
      return prev.filter((item) => item.id !== id);
    });
    try {
      return await archiveActivityApi(id);
    } catch (error) {
      if (snapshot) {
        const restored = snapshot;
        setActivities((prev) => insertActivityBySortOrder(prev, restored));
      }
      throw error;
    }
  }, []);

  const restoreActivity = useCallback(async (id: string, optimistic?: ActivityRecord) => {
    if (optimistic) {
      setActivities((prev) => insertActivityBySortOrder(prev, { ...optimistic, archived_at: null }));
    }
    try {
      const restored = await restoreActivityApi(id);
      setActivities((prev) => insertActivityBySortOrder(prev, restored));
      return restored;
    } catch (error) {
      if (optimistic) {
        setActivities((prev) => prev.filter((item) => item.id !== id));
      }
      throw error;
    }
  }, []);

  return {
    activities,
    routines,
    logs,
    insights,
    loading,
    busyId: busyIds.values().next().value ?? null,
    busyIds,
    isBusy: (id: string) => busyIds.has(id) || inFlightRef.current.has(id),
    reload,
    complete,
    createActivity,
    updateActivity,
    archiveActivity,
    restoreActivity,
    createRoutine,
    updateRoutine,
    archiveRoutine,
  };
}
