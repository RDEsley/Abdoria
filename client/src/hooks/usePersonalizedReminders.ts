import { useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { normalizePersonalizedReminders } from '@shared/reminders';
import { Capacitor } from '@capacitor/core';

export function usePersonalizedReminders() {
  const { user } = useAuth();
  const optOut = user?.preferencias?.notificacoes_opt_out ?? false;
  const reminders = useMemo(
    () => normalizePersonalizedReminders(user?.preferencias?.lembretes_personalizados ?? []),
    [user?.preferencias?.lembretes_personalizados],
  );

  useEffect(() => {
    const sync = () =>
      void notificationScheduler.sync(reminders, { optOut }).catch((error) => {
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
  }, [reminders, optOut]);
}
