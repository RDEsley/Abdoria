import type { CSSProperties } from 'react';
import {
  AlarmClock,
  BookOpen,
  Circle,
  Dumbbell,
  Droplets,
  HeartPulse,
  Leaf,
  ShieldPlus,
  Star,
} from 'lucide-react';
import {
  PERSONAL_NOTIFICATION_COLORS,
  type PersonalNotificationColor,
  type PersonalNotificationIcon,
} from '@shared/reminders';
import type { RecurrenceDraft } from './reminder-form-types';

const ICONS = {
  neutral: Circle,
  water: Droplets,
  leaf: Leaf,
  workout: Dumbbell,
  study: BookOpen,
  health: ShieldPlus,
  alarm: AlarmClock,
  heart: HeartPulse,
  star: Star,
} satisfies Record<PersonalNotificationIcon, typeof Circle>;

interface ReminderNotificationPreviewProps {
  title: string;
  message: string;
  icon: PersonalNotificationIcon;
  color: PersonalNotificationColor;
  recurrence: RecurrenceDraft;
  times: string[];
  onceDate: string;
}

function describeSchedule(recurrence: RecurrenceDraft, times: string[], onceDate: string): string {
  const time = times[0] || '—:—';
  if (recurrence === 'once') {
    if (!onceDate) return `Uma vez · ${time}`;
    return `Uma vez · ${onceDate.split('-').reverse().join('/')} · ${time}`;
  }
  if (recurrence === 'daily') return `Todos os dias · ${time}`;
  return `Dias específicos · ${time}`;
}

export function ReminderNotificationPreview({
  title,
  message,
  icon,
  color,
  recurrence,
  times,
  onceDate,
}: ReminderNotificationPreviewProps) {
  const Icon = ICONS[icon];
  const accent = PERSONAL_NOTIFICATION_COLORS.find((entry) => entry.id === color)?.hex ?? '#64748b';
  const previewTitle = title.trim() || 'Seu lembrete';
  const previewBody = message.trim() || 'Uma mensagem curta aparece aqui.';

  return (
    <div className="reminder-preview" style={{ '--reminder-accent': accent } as CSSProperties}>
      <p className="reminder-preview__label">Prévia</p>
      <div className="reminder-preview__card">
        <span className="reminder-preview__icon" aria-hidden>
          <Icon size={20} />
        </span>
        <div className="reminder-preview__copy">
          <strong>{previewTitle}</strong>
          <p>{previewBody}</p>
          <small>{describeSchedule(recurrence, times, onceDate)}</small>
        </div>
      </div>
    </div>
  );
}
