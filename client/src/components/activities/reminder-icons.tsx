import type { PersonalNotificationIcon } from '@shared/reminders';
import { REMINDER_ICON_COMPONENTS } from './reminder-icon-map';

export function ReminderIcon({
  icon,
  size = 18,
}: {
  icon: PersonalNotificationIcon;
  size?: number;
}) {
  const Icon = REMINDER_ICON_COMPONENTS[icon];
  return <Icon size={size} aria-hidden />;
}
