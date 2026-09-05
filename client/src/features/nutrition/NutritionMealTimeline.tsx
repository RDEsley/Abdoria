import { Plus } from 'lucide-react';
import {
  MEAL_TYPE_LABELS,
  type DayNutritionSummary,
  type MealType,
  type NutritionMealReminder,
  type NutritionProfile,
} from '@shared/nutrition';
import {
  enabledMealReminders,
  resolveMealTimelineStatus,
  type MealTimelineStatus,
} from './nutrition-utils';

const STATUS_LABEL: Record<MealTimelineStatus, string> = {
  registered: 'Registrada',
  pending: 'Em breve',
  past: 'Sem registro',
};

export function NutritionMealTimeline({
  profile,
  day,
  onOpenMeal,
  onRemoveLog,
}: {
  profile: NutritionProfile | null;
  day: DayNutritionSummary | null;
  onOpenMeal: (meal: MealType) => void;
  onRemoveLog: (id: string) => void;
}) {
  const reminders = enabledMealReminders(profile);
  const rows: NutritionMealReminder[] =
    reminders.length > 0
      ? reminders
      : (
          ['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]
        ).map((meal_type) => ({
          meal_type,
          label: MEAL_TYPE_LABELS[meal_type],
          time: '',
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          enabled: true,
        }));

  return (
    <section className="nutrition-timeline">
      <header className="nutrition-section-head">
        <h3>Refeições</h3>
      </header>
      <ul className="nutrition-timeline__list">
        {rows.map((reminder) => {
          const mealType = (reminder.meal_type === 'custom'
            ? 'other'
            : reminder.meal_type) as MealType;
          const block = day?.meals.find((entry) => entry.meal_type === mealType);
          const hasLogs = (block?.logs.length ?? 0) > 0;
          const status = resolveMealTimelineStatus(reminder, hasLogs);
          return (
            <li key={`${mealType}-${reminder.time}`} className={`nutrition-timeline__item is-${status}`}>
              <button
                type="button"
                className="nutrition-timeline__main"
                onClick={() => onOpenMeal(mealType)}
              >
                <div>
                  <strong>{reminder.label || MEAL_TYPE_LABELS[mealType]}</strong>
                  <small>
                    {reminder.time ? `${reminder.time} · ` : ''}
                    {STATUS_LABEL[status]}
                    {hasLogs ? ` · ${Math.round(block!.totals.calories)} kcal` : ''}
                  </small>
                </div>
                <span className="nutrition-timeline__add" aria-hidden>
                  <Plus size={16} />
                </span>
              </button>
              {hasLogs && (
                <ul className="nutrition-timeline__logs">
                  {block!.logs.map((log) => (
                    <li key={log.id}>
                      <div>
                        <strong>{log.food_name_snapshot}</strong>
                        <small>
                          {log.quantity}× · {Math.round(log.calories)} kcal
                        </small>
                      </div>
                      <button type="button" onClick={() => onRemoveLog(log.id)}>
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
