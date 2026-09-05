import {
  MEAL_TYPE_LABELS,
  type MealType,
  type NutritionGoal,
  type NutritionMealReminder,
  type NutritionProfile,
} from '@shared/nutrition';
import { getMinutesOfDaySaoPaulo } from '@shared/utils/timezone';

export const NUTRITION_CORE_MEALS = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
  'supper',
] as const satisfies ReadonlyArray<Exclude<MealType, 'other'>>;

export const DEFAULT_MEAL_TIMES: Record<
  Exclude<MealType, 'other'>,
  string
> = {
  breakfast: '07:30',
  lunch: '12:30',
  snack: '16:00',
  dinner: '19:30',
  supper: '21:30',
};

export const GOAL_OPTIONS: Array<{
  id: NutritionGoal;
  title: string;
  hint: string;
}> = [
  {
    id: 'maintain',
    title: 'Manter meu peso',
    hint: 'Equilíbrio suave no dia a dia, sem pressão.',
  },
  {
    id: 'gain',
    title: 'Ganhar peso ou massa',
    hint: 'Um pouco mais de energia para acompanhar o treino.',
  },
  {
    id: 'lose',
    title: 'Perder peso',
    hint: 'Um ritmo um pouco mais leve — no seu tempo.',
  },
  {
    id: 'track',
    title: 'Só quero acompanhar',
    hint: 'Registrar o que come, sem meta calórica.',
  },
];

export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function formatMinutesAsTime(total: number): string {
  const clamped = ((total % 1440) + 1440) % 1440;
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function defaultMealReminders(
  existing?: NutritionMealReminder[] | null,
): NutritionMealReminder[] {
  const byType = new Map(
    (existing ?? [])
      .filter((item) => item.meal_type !== 'custom' && item.meal_type !== 'other')
      .map((item) => [item.meal_type as MealType, item]),
  );
  return NUTRITION_CORE_MEALS.map((meal_type) => {
    const prev = byType.get(meal_type);
    return {
      meal_type,
      label: prev?.label ?? MEAL_TYPE_LABELS[meal_type],
      time: prev?.time ?? DEFAULT_MEAL_TIMES[meal_type],
      weekdays: prev?.weekdays?.length ? prev.weekdays : [0, 1, 2, 3, 4, 5, 6],
      enabled: prev?.enabled ?? meal_type !== 'supper',
      reminder_id: prev?.reminder_id,
    };
  });
}

export function enabledMealReminders(
  profile: NutritionProfile | null | undefined,
): NutritionMealReminder[] {
  const list = defaultMealReminders(profile?.preferences?.meal_reminders);
  return list.filter((item) => item.enabled);
}

export function findNextMeal(
  reminders: NutritionMealReminder[],
  now = new Date(),
): NutritionMealReminder | null {
  const enabled = reminders.filter((item) => item.enabled);
  if (enabled.length === 0) return null;
  const nowMinutes = getMinutesOfDaySaoPaulo(now);
  const upcoming = enabled
    .map((item) => ({ item, minutes: parseTimeToMinutes(item.time) }))
    .filter((row): row is { item: NutritionMealReminder; minutes: number } => row.minutes != null)
    .sort((a, b) => a.minutes - b.minutes);
  if (upcoming.length === 0) return null;
  const next = upcoming.find((row) => row.minutes >= nowMinutes);
  return (next ?? upcoming[0]!).item;
}

export type MealTimelineStatus = 'registered' | 'pending' | 'past';

export function resolveMealTimelineStatus(
  reminder: NutritionMealReminder,
  hasLogs: boolean,
  now = new Date(),
): MealTimelineStatus {
  if (hasLogs) return 'registered';
  const minutes = parseTimeToMinutes(reminder.time);
  if (minutes == null) return 'pending';
  const nowMinutes = getMinutesOfDaySaoPaulo(now);
  if (nowMinutes > minutes + 45) return 'past';
  return 'pending';
}

export function dietStyleFlags(style: string | undefined): {
  vegetarian: boolean;
  vegan: boolean;
  lactose_free: boolean;
} {
  return {
    vegetarian: style === 'vegetarian' || style === 'vegan',
    vegan: style === 'vegan',
    lactose_free: style === 'lactose_free',
  };
}

export function isMealTypeParam(value: string | null): value is MealType {
  return (
    value === 'breakfast' ||
    value === 'lunch' ||
    value === 'snack' ||
    value === 'dinner' ||
    value === 'supper' ||
    value === 'other'
  );
}
