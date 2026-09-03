import { useCallback, useEffect, useState } from 'react';
import {
  archiveActivity,
  completeActivity,
  createActivity,
  createRoutine,
  listActivities,
  listActivityLogs,
  listRoutines,
  updateActivity,
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
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import type { ActivityLogRecord, ActivityRecord, RoutineRecord } from '@shared/activities';
import type { EvolynInsight } from '@shared/activities';
import { addDaysSaoPaulo, getTodaySaoPaulo } from '@shared/utils/timezone';

export function useActivitiesData() {
  const { refresh, markStreakSecuredToday } = useApp();
  const { applyUser } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [insights, setInsights] = useState<EvolynInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const complete = useCallback(
    async (
      activity: ActivityRecord,
      options?: {
        kind?: 'full' | 'minimum';
        note?: string;
        metrics?: Record<string, unknown>;
        routineId?: string;
      },
    ) => {
      setBusyId(activity.id);
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
        emitXpEarned(result.xp_ganho);
        void successHaptic();
        playCompleteSet();
        const derived = deriveActivityReminders([activity], []);
        for (const reminder of derived) {
          void notificationScheduler.cancel(reminder.id);
        }
        const ganho = result.xp_ganho > 0 ? `+${result.xp_ganho} XP` : 'Registrado';
        showGameToast(`${activity.name}: ${ganho}`, { variant: 'success' });
        await reload();
        void refresh();
        return result;
      } catch (error) {
        showGameToast(getErrorMessage(error, 'Não foi possível registrar.'), { variant: 'error' });
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [applyUser, markStreakSecuredToday, refresh, reload],
  );

  return {
    activities,
    routines,
    logs,
    insights,
    loading,
    busyId,
    reload,
    complete,
    createActivity,
    updateActivity,
    archiveActivity,
    createRoutine,
    archiveRoutine,
  };
}
