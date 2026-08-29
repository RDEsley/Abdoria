export type ReminderSkin = 'calm' | 'energy' | 'focus' | 'nature' | 'minimal';

export interface PersonalizedReminder {
  id: string;
  title: string;
  message: string;
  time: string;
  weekdays: number[];
  skin: ReminderSkin;
  enabled: boolean;
  createdAt: string;
}

export const REMINDER_SKINS: ReadonlyArray<{
  id: ReminderSkin;
  label: string;
  description: string;
  emoji: string;
}> = [
  { id: 'calm', label: 'Calma', description: 'Azul suave', emoji: '🌙' },
  { id: 'energy', label: 'Energia', description: 'Laranja vibrante', emoji: '⚡' },
  { id: 'focus', label: 'Foco', description: 'Violeta profundo', emoji: '🎯' },
  { id: 'nature', label: 'Natureza', description: 'Verde orgânico', emoji: '🌿' },
  { id: 'minimal', label: 'Minimal', description: 'Neutro e discreto', emoji: '○' },
] as const;

export function normalizeReminderWeekdays(days: number[]): number[] {
  return [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort(
    (a, b) => a - b,
  );
}

export function isReminderDue(reminder: PersonalizedReminder, date: Date): boolean {
  if (!reminder.enabled || !reminder.weekdays.includes(date.getDay())) return false;
  const [hour, minute] = reminder.time.split(':').map(Number);
  return date.getHours() === hour && date.getMinutes() === minute;
}
