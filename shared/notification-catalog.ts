/**
 * Notification appearance catalogue.
 *
 * Sound personalisation was removed in Playful 2.0 — notifications now use
 * the default platform/OS sound.  Legacy `sound` values in persisted JSONB
 * are silently ignored (see reminders.ts normalisation).
 *
 * A imagem de sistema das notificações Evolyn é o broto-assistente
 * (`evolyn-96` / `evolyn-192`). Ícones de categoria (água, treino…) ficam
 * só na personalização in-app.
 */

export type PersonalNotificationIcon =
  'neutral' | 'water' | 'leaf' | 'workout' | 'study' | 'health' | 'alarm' | 'heart' | 'star';

/** Ícone colorido (tray / large icon) — broto-assistente. */
export const EVOLYN_NOTIFICATION_ICON = '/media/notifications/icons/evolyn-192.png';

/** Badge monochrome-friendly menor — mesma arte em 96px. */
export const EVOLYN_NOTIFICATION_BADGE = '/media/notifications/icons/evolyn-96.png';

export const NOTIFICATION_ICON_FALLBACK = EVOLYN_NOTIFICATION_ICON;

/** @deprecated Prefer EVOLYN_NOTIFICATION_* — categorias não vão mais pro SO. */
export function getNotificationIconUrl(
  icon: PersonalNotificationIcon,
  size: 96 | 192 = 192,
): string {
  void icon;
  return size === 96 ? EVOLYN_NOTIFICATION_BADGE : EVOLYN_NOTIFICATION_ICON;
}

export function resolveNotificationIconUrl(_icon?: PersonalNotificationIcon): string {
  return EVOLYN_NOTIFICATION_ICON;
}

export function resolveNotificationBadgeUrl(_icon?: PersonalNotificationIcon): string {
  return EVOLYN_NOTIFICATION_BADGE;
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
    icon: EVOLYN_NOTIFICATION_ICON,
    badge: EVOLYN_NOTIFICATION_BADGE,
  };
}
