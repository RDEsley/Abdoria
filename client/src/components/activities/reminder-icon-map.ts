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
import type { PersonalNotificationIcon } from '@shared/reminders';

/** Ícones disponíveis para lembretes pessoais — usado na prévia, no picker e na lista. */
export const REMINDER_ICON_COMPONENTS = {
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
