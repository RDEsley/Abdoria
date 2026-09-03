/**
 * Notification appearance catalogue.
 *
 * Sound personalisation was removed in Playful 2.0 — notifications now use
 * the default platform/OS sound.  Legacy `sound` values in persisted JSONB
 * are silently ignored (see reminders.ts normalisation).
 *
 * Only icon / badge helpers and the web-push payload builder remain.
 */

export type PersonalNotificationIcon =
  'neutral' | 'water' | 'leaf' | 'workout' | 'study' | 'health' | 'alarm' | 'heart' | 'star';

export function getNotificationIconUrl(
  icon: PersonalNotificationIcon,
  size: 96 | 192 = 192,
): string {
  return `/media/notifications/icons/${icon}-${size}.png`;
}

export const NOTIFICATION_ICON_FALLBACK = '/brand/favicon-192.png';

export function resolveNotificationIconUrl(icon: PersonalNotificationIcon): string {
  return getNotificationIconUrl(icon, 192);
}

export function resolveNotificationBadgeUrl(icon: PersonalNotificationIcon): string {
  return getNotificationIconUrl(icon, 96);
}

export interface WebPushNotificationPayload {
  title: string;
  body: string;
  tag: string;
  icon: string;
  badge: string;
}

export function buildWebPushNotificationPayload(
  reminder: {
    id: string;
    title: string;
    message: string;
    icon: PersonalNotificationIcon;
  },
  _occurrenceKey: string,
): WebPushNotificationPayload {
  return {
    title: reminder.title,
    body: reminder.message || 'Hora do seu lembrete no Evolyn.',
    tag: reminder.id,
    icon: resolveNotificationIconUrl(reminder.icon),
    badge: resolveNotificationBadgeUrl(reminder.icon),
  };
}
