import { getSaoPauloWeekday } from '@shared/utils/timezone';
import type { DaySnapshot } from '@/lib/api/day';

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function weekdayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
  return WEEKDAY_LABELS[getSaoPauloWeekday(noonUtc)] ?? '';
}

export function WeekStrip({ week }: { week: DaySnapshot['week'] }) {
  return (
    <section className="glass-card p-4">
      <h3 className="game-section-title">Sua semana</h3>
      <div className="mt-3 flex justify-between gap-1">
        {week.map((day) => (
          <div
            key={day.day_key}
            className={`home-week-day${day.active ? ' home-week-day--active' : ''}${day.frozen ? ' home-week-day--frozen' : ''}`}
            aria-label={`${weekdayLabel(day.day_key)} ${day.day_key.slice(8)}: ${day.workouts} treino(s), ${day.activities} atividade(s)`}
          >
            <span>{weekdayLabel(day.day_key)}</span>
            <strong>{day.day_key.slice(8)}</strong>
            <span className="home-week-dots" aria-hidden>
              {day.workouts > 0 && <i className="home-week-dot home-week-dot--workout" />}
              {day.activities > 0 && <i className="home-week-dot home-week-dot--activity" />}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
