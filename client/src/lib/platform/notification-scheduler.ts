import { isReminderDue, type PersonalizedReminder } from '@shared/reminders';
import { Capacitor } from '@capacitor/core';

export type NotificationPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface NotificationScheduler {
  permissionState(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  sync(reminders: PersonalizedReminder[]): Promise<void>;
  cancel(id: string): Promise<void>;
}

function webPermissionState(): NotificationPermissionState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

/** Fallback web: entrega no carregamento/retorno ao app; não promete execução em background. */
export const webNotificationScheduler: NotificationScheduler = {
  async permissionState() {
    return webPermissionState();
  },
  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    return result === 'default' ? 'prompt' : result;
  },
  async sync(reminders) {
    if (webPermissionState() !== 'granted') return;
    const now = new Date();
    for (const reminder of reminders) {
      if (!isReminderDue(reminder, now)) continue;
      const deliveryKey = `evolyn:notification:${reminder.id}:${now.toISOString().slice(0, 10)}:${reminder.time}`;
      if (localStorage.getItem(deliveryKey)) continue;
      new Notification(reminder.title, {
        body: reminder.message,
        icon: '/brand/favicon-192.png',
        tag: reminder.id,
      });
      localStorage.setItem(deliveryKey, '1');
    }
  },
  async cancel(id) {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(`evolyn:notification:${id}:`)) localStorage.removeItem(key);
    }
  },
};

function numericId(value: string, occurrence: number): number {
  let hash = 0;
  for (const character of `${value}:${occurrence}`)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return Math.max(1, hash % 2_000_000_000);
}

const nativeNotificationScheduler: NotificationScheduler = {
  async permissionState() {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'prompt-with-rationale' || result.display === 'prompt'
      ? 'prompt'
      : result.display;
  },
  async requestPermission() {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted' ? 'granted' : 'denied';
  },
  async sync(reminders) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;
    const pending = await LocalNotifications.getPending();
    const personalized = pending.notifications.filter((item) => item.extra?.reminderId);
    if (personalized.length) await LocalNotifications.cancel({ notifications: personalized });
    const now = new Date();
    const notifications = reminders
      .filter((item) => item.enabled)
      .flatMap((reminder) => {
        const [hour, minute] = reminder.time.split(':').map(Number);
        return Array.from({ length: 14 }, (_, offset) => {
          const at = new Date(now);
          at.setDate(now.getDate() + offset);
          at.setHours(hour, minute, 0, 0);
          return { at, offset };
        })
          .filter(({ at }) => at > now && reminder.weekdays.includes(at.getDay()))
          .map(({ at, offset }) => ({
            id: numericId(reminder.id, offset),
            title: reminder.title,
            body: reminder.message,
            schedule: { at },
            extra: { reminderId: reminder.id },
          }));
      });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  },
  async cancel(id) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    const notifications = pending.notifications.filter((item) => item.extra?.reminderId === id);
    if (notifications.length) await LocalNotifications.cancel({ notifications });
  },
};

export const notificationScheduler: NotificationScheduler = Capacitor.isNativePlatform()
  ? nativeNotificationScheduler
  : webNotificationScheduler;
