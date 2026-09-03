import type { PersonalNotificationColor, PersonalNotificationIcon } from '@shared/reminders';
import type { ReminderSoundId } from '@shared/reminder-sounds';

export type RecurrenceDraft = 'once' | 'daily' | 'weekdays';

/** Campos do rascunho de lembrete editáveis diretamente na prévia. */
export interface ReminderDraftSlice {
  title: string;
  message: string;
  recurrence: RecurrenceDraft;
  onceDate: string;
  times: string[];
  weekdays: number[];
  icon: PersonalNotificationIcon;
  color: PersonalNotificationColor;
  sound: ReminderSoundId;
}
