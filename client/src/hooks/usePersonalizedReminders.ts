import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { deriveActivityReminders, normalizePersonalizedReminders } from '@shared/reminders';
import { listUnlockedReminderPacks } from '@shared/reminder-sounds';
import { Capacitor } from '@capacitor/core';
import { listActivities, listRoutines } from '@/lib/api/activities';
import type { ActivityRecord, RoutineRecord } from '@shared/activities';

export function usePersonalizedReminders() {
  const { user } = useAuth();
  const optOut = user?.preferencias?.notificacoes_opt_out ?? false;
  const unlockedSoundPacks = listUnlockedReminderPacks(user?.cosmeticos?.desbloqueados);
  const personal = useMemo(
    () => normalizePersonalizedReminders(user?.preferencias?.lembretes_personalizados ?? []),
    [user?.preferencias?.lembretes_personalizados],
  );
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    Promise.all([listActivities(), listRoutines()])
      .then(([nextActivities, nextRoutines]) => {
        if (cancelled) return;
        setActivities(nextActivities);
        setRoutines(nextRoutines);
      })
      .catch(() => {
        /* dispatcher ainda funciona com lembretes livres */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const reminders = useMemo(
    () => [...personal, ...deriveActivityReminders(activities, routines)],
    [personal, activities, routines],
  );

  useEffect(() => {
    const sync = () =>
      void notificationScheduler.sync(reminders, { optOut, unlockedSoundPacks }).catch((error) => {
        console.error('Falha ao sincronizar lembretes personalizados:', error);
      });

    sync();

    if (Capacitor.isNativePlatform()) {
      const onAppState = (event: Event) => {
        const detail = (event as CustomEvent<{ isActive?: boolean }>).detail;
        if (detail?.isActive) sync();
      };
      window.addEventListener('evolyn:app-state', onAppState);
      return () => window.removeEventListener('evolyn:app-state', onAppState);
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reminders, optOut, unlockedSoundPacks]);
}
