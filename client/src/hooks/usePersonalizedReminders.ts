import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';

export function usePersonalizedReminders() {
  const { user } = useAuth();

  useEffect(() => {
    const reminders = user?.preferencias?.lembretes_personalizados ?? [];
    const sync = () => void notificationScheduler.sync(reminders);
    sync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.preferencias?.lembretes_personalizados]);
}
