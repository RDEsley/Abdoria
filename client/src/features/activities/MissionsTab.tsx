import { useEffect, useMemo, useState } from 'react';
import { addDaysSaoPaulo, getTodaySaoPaulo, getWeekStartSaoPaulo } from '@shared/utils/timezone';
import { consistencyLast30Days, type ActivityLogRecord } from '@shared/activities';
import { QuestCard } from '@/components/quests/QuestCard';
import type { useActivitiesData } from './useActivitiesData';

const LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Aba Missões — missões em destaque; insights de ritmo em seção secundária. */
export function MissionsTab({ data }: { data: ReturnType<typeof useActivitiesData> }) {
  const today = getTodaySaoPaulo();
  const monday = getWeekStartSaoPaulo();
  const [selected, setSelected] = useState(today);
  useEffect(() => {
    setSelected(today);
  }, [today]);
  const week = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysSaoPaulo(monday, index)),
    [monday],
  );
  const logsByDay = useMemo(() => {
    const map = new Map<string, ActivityLogRecord[]>();
    for (const log of data.logs) {
      const list = map.get(log.day_key) ?? [];
      list.push(log);
      map.set(log.day_key, list);
    }
    return map;
  }, [data.logs]);
  const selectedLogs = logsByDay.get(selected) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <QuestCard />

      <section className="flex flex-col gap-2">
        <h3 className="game-section-title">Seu ritmo</h3>
        {data.insights.length === 0 ? (
          <p className="text-sm font-bold text-stone-500">
            Insights aparecem quando houver consistência suficiente.
          </p>
        ) : (
          data.insights.map((insight) => (
            <article key={insight.id} className="glass-card glass-card--rotina p-3">
              <h4 className="text-sm font-extrabold text-stone-800">{insight.title}</h4>
              <p className="mt-1 text-xs font-semibold text-stone-500">{insight.body}</p>
            </article>
          ))
        )}
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title">Semana</h3>
        <div className="mt-3 flex justify-between gap-1">
          {week.map((day, index) => {
            const has = (logsByDay.get(day)?.length ?? 0) > 0;
            return (
              <button
                key={day}
                type="button"
                className={`home-week-day${day === selected ? ' home-week-day--on' : ''}${has ? ' home-week-day--active' : ''}`}
                onClick={() => setSelected(day)}
              >
                <span>{LABELS[index]}</span>
                <strong>{day.slice(8)}</strong>
              </button>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {selectedLogs.length === 0 && (
            <li className="text-sm font-bold text-stone-500">Nada registrado neste dia.</li>
          )}
          {selectedLogs.map((log) => (
            <li key={log.id} className="text-sm font-bold text-stone-700">
              {log.activity_name_snapshot}
              {log.xp_awarded > 0 ? ` · +${log.xp_awarded} XP` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title">Consistência (30 dias)</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {data.activities.slice(0, 8).map((activity) => {
            const consistency = consistencyLast30Days(activity.id, data.logs, today);
            return (
              <li
                key={activity.id}
                className="flex justify-between text-sm font-bold text-stone-700"
              >
                <span>{activity.name}</span>
                <span>
                  {consistency.days_done}/{consistency.days_window}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** @deprecated alias — use MissionsTab */
export const InsightsTab = MissionsTab;
