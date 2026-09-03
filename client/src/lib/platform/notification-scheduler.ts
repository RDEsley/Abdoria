import {
  PERSONAL_NOTIFICATION_COLORS,
  PERSONAL_NOTIFICATION_MAX_REQUESTS,
  buildNativeNotificationSchedules,
  isReminderDue,
  type PersonalizedReminder,
} from '@shared/reminders';
import { buildWebPushNotificationPayload } from '@shared/notification-catalog';
import { Capacitor } from '@capacitor/core';
import { ensureWebPushSubscription } from '@/lib/platform/web-push';
import {
  ensureAndroidNotificationChannels,
  getDefaultChannelId,
  resolveNativeLargeIconPath,
} from '@/lib/notification-native';

export type NotificationPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface NotificationSyncOptions {
  optOut?: boolean;
}

export interface NotificationScheduler {
  permissionState(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  sync(reminders: PersonalizedReminder[], options?: NotificationSyncOptions): Promise<void>;
  cancel(id: string): Promise<void>;
}

function webPermissionState(): NotificationPermissionState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

async function deliverFocusedWebReminders(reminders: PersonalizedReminder[]): Promise<void> {
  if (webPermissionState() !== 'granted') return;
  const now = new Date();
  for (const reminder of reminders) {
    if (!isReminderDue(reminder, now)) continue;
    const minuteKey = now.toISOString().slice(0, 16);
    const deliveryKey = `evolyn:notification:${reminder.id}:${minuteKey}`;
    if (localStorage.getItem(deliveryKey)) continue;

    const occurrenceKey = `${reminder.id}:focused:${minuteKey}`;
    const payload = buildWebPushNotificationPayload(reminder, occurrenceKey);
    const registration = await navigator.serviceWorker?.getRegistration('/');
    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
    };

    if (registration) {
      await registration.showNotification(payload.title, options);
    } else {
      new Notification(payload.title, options);
    }
    localStorage.setItem(deliveryKey, '1');
  }
}

const webNotificationScheduler: NotificationScheduler = {
  async permissionState() {
    return webPermissionState();
  },
  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    return result === 'default' ? 'prompt' : result;
  },
  async sync(reminders, options) {
    if (options?.optOut) return;
    if (webPermissionState() !== 'granted') return;

    const enabled = reminders.filter((item) => item.enabled);
    const subscribed = await ensureWebPushSubscription().catch(() => false);
    if (!subscribed) {
      await deliverFocusedWebReminders(enabled);
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
  async sync(reminders, options) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const permission = await LocalNotifications.checkPermissions();
    const pending = await LocalNotifications.getPending();
    const personalized = pending.notifications.filter((item) => item.extra?.reminderId);
    if (personalized.length) await LocalNotifications.cancel({ notifications: personalized });

    if (options?.optOut || permission.display !== 'granted') return;

    await ensureAndroidNotificationChannels();

    const now = Date.now();
    const channelId = getDefaultChannelId();
    const planned = reminders
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
            channelId,
            smallIcon: Capacitor.getPlatform() === 'android' ? 'ic_stat_evolyn' : undefined,
            largeIcon:
              Capacitor.getPlatform() === 'android'
                ? resolveNativeLargeIconPath(reminder.icon)
                : undefined,
            iconColor: color,
            extra: {
              reminderId: reminder.id,
              icon: reminder.icon,
              color: reminder.color,
            },
          }));
      })
      .slice(0, PERSONAL_NOTIFICATION_MAX_REQUESTS);

    if (planned.length) {
      const result = await LocalNotifications.schedule({ notifications: planned });
      if (result.notifications.length !== planned.length) {
        throw new Error('Nem todas as notificações nativas foram agendadas.');
      }
    }
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
