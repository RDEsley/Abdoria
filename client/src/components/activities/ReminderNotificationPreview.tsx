import type { CSSProperties } from 'react';
import {
  AlarmClock,
  BellRing,
  BookOpen,
  Circle,
  Dumbbell,
  Droplets,
  HeartPulse,
  Leaf,
  ShieldPlus,
  Star,
  Volume2,
} from 'lucide-react';
import { getNotificationSound } from '@shared/notification-catalog';
import {
  PERSONAL_NOTIFICATION_COLORS,
  type PersonalNotificationColor,
  type PersonalNotificationIcon,
  type PersonalNotificationSound,
} from '@shared/reminders';
import { toggleNotificationSoundPreview } from '@/lib/notification-sound-preview';
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
  sound: PersonalNotificationSound;
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
  sound,
  recurrence,
  times,
  onceDate,
}: ReminderNotificationPreviewProps) {
  const Icon = ICONS[icon];
  const accent = PERSONAL_NOTIFICATION_COLORS.find((entry) => entry.id === color)?.hex ?? '#64748b';
  const soundLabel = getNotificationSound(sound).label;
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
        <button
          type="button"
          className="reminder-preview__listen"
          aria-label={`Ouvir som ${soundLabel}`}
          onClick={() => void toggleNotificationSoundPreview(sound)}
        >
          <Volume2 size={16} aria-hidden />
        </button>
      </div>
      <p className="reminder-preview__meta">
        <BellRing size={12} aria-hidden /> {soundLabel}
      </p>
    </div>
  );
}
