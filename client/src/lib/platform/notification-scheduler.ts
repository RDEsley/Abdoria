import {
  PERSONAL_NOTIFICATION_COLORS,
  PERSONAL_NOTIFICATION_MAX_REQUESTS,
  buildNativeNotificationSchedules,
  isReminderDue,
  normalizePersonalizedReminders,
  type PersonalizedReminder,
} from '@shared/reminders';
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
      const minuteKey = now.toISOString().slice(0, 16);
      const deliveryKey = `evolyn:notification:${reminder.id}:${minuteKey}`;
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

function numericId(value: string, occurrence: string): number {
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
    if (Capacitor.getPlatform() === 'android') {
      await Promise.all([
        LocalNotifications.createChannel({
          id: 'evolyn-personal-default',
          name: 'Notificações personalizadas',
          description: 'Alertas pessoais programados no Evolyn',
          importance: 3,
          sound: 'default',
          vibration: true,
        }),
        LocalNotifications.createChannel({
          id: 'evolyn-personal-silent',
          name: 'Notificações silenciosas',
          description: 'Alertas pessoais sem som ou vibração',
          importance: 2,
          vibration: false,
        }),
      ]);
    }

    const now = Date.now();
    const notifications = reminders
      .filter((item) => item.enabled)
      .flatMap((reminder) => {
        const color = PERSONAL_NOTIFICATION_COLORS.find(({ id }) => id === reminder.color)?.hex;
        return buildNativeNotificationSchedules(reminder)
          .filter((descriptor) => !descriptor.at || new Date(descriptor.at).getTime() > now)
          .map((descriptor) => ({
            id: numericId(reminder.id, descriptor.occurrenceKey),
            title: reminder.title,
            body: reminder.message,
            schedule: descriptor.at
              ? { at: new Date(descriptor.at) }
              : {
                  on: descriptor.on as {
                    weekday?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
                    hour: number;
                    minute: number;
                  },
                },
            sound: reminder.sound === 'default' ? 'default' : undefined,
            channelId:
              reminder.sound === 'silent' ? 'evolyn-personal-silent' : 'evolyn-personal-default',
            iconColor: color,
            // Android/iOS controlam o small/app icon da notificação. A escolha
            // do usuário continua no payload para identidade dentro do Evolyn;
            // não prometemos trocar dinamicamente o ícone do aplicativo.
            extra: { reminderId: reminder.id, icon: reminder.icon, color: reminder.color },
          }));
      })
      .slice(0, PERSONAL_NOTIFICATION_MAX_REQUESTS);
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

export function normalizeNotificationsForScheduling(raw: unknown): PersonalizedReminder[] {
  return normalizePersonalizedReminders(raw);
}
