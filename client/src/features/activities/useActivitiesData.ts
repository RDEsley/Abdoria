import { useCallback, useEffect, useRef, useState } from 'react';
import {
  archiveActivity,
  completeActivity,
  createActivity,
  createRoutine,
  listActivities,
  listActivityLogs,
  listRoutines,
  updateActivity,
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
import type { EvolynInsight } from '@shared/activities';
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
        /** Quando true, o caller cuida do feedback imediato (haptic/UI). */
        silentFeedback?: boolean;
      },
    ) => {
      if (inFlightRef.current.has(activity.id)) return null;
      inFlightRef.current.add(activity.id);
      setBusyIds((prev) => new Set(prev).add(activity.id));
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

        // Aplica log autoritativo imediatamente (não espera refetch completo).
        if (result.log) {
          setLogs((prev) => {
            if (prev.some((entry) => entry.id === result.log.id)) return prev;
            return [result.log, ...prev];
          });
        }

        if (!options?.silentFeedback) {
          emitXpEarned(result.xp_ganho);
          void successHaptic();
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

        // Reconcilia listas/stats em background — não bloqueia o caller.
        void reload().catch(() => undefined);
        void refresh();

        return result;
      } catch (error) {
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
    createRoutine,
    updateRoutine,
    archiveRoutine,
  };
}

