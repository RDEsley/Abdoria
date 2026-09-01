import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { normalizePersonalizedReminders } from '@shared/reminders';

export function usePersonalizedReminders() {
  const { user } = useAuth();

  useEffect(() => {
    const reminders = normalizePersonalizedReminders(
      user?.preferencias?.lembretes_personalizados ?? [],
    );
    const sync = () => void notificationScheduler.sync(reminders);
    sync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    const onAppState = (event: Event) => {
      const detail = (event as CustomEvent<{ isActive?: boolean }>).detail;
      if (detail?.isActive) sync();
    };
    window.addEventListener('focus', sync);
    window.addEventListener('evolyn:app-state', onAppState);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('evolyn:app-state', onAppState);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.preferencias?.lembretes_personalizados]);
}
