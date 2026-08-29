import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isReminderDue } from '@shared/reminders';

export function usePersonalizedReminders() {
  const { user } = useAuth();

  useEffect(() => {
    const check = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      for (const reminder of user?.preferencias?.lembretes_personalizados ?? []) {
        if (!isReminderDue(reminder, now)) continue;
        const day = now.toISOString().slice(0, 10);
        const key = `evolyn:reminder:${reminder.id}:${day}:${reminder.time}`;
        if (localStorage.getItem(key)) continue;
        new Notification(reminder.title, {
          body: reminder.message,
          icon: '/brand/favicon-192.png',
          tag: reminder.id,
        });
        localStorage.setItem(key, '1');
      }
    };
    check();
    const interval = window.setInterval(check, 30_000);
    return () => window.clearInterval(interval);
  }, [user?.preferencias?.lembretes_personalizados]);
}
