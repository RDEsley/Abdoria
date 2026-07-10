import { useEffect, useMemo } from 'react';
import { useApp } from '@/hooks/useApp';
import { formatTrainingDuration } from '@/lib/utils';
import { toLocalDateKey } from '@/lib/utils';

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

interface DayCell {
  key: string;
  label: string;
  trained: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Snapshot da semana corrente (segunda a domingo): dias treinados, total de
 * treinos, tempo e XP. Base do resumo semanal completo planejado na Fase 7.
 */
export function WeekSummary() {
  const { history, ensureHistory, historyLoading } = useApp();

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const { days, totals } = useMemo(() => {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);

    const weekKeys = Array.from({ length: 7 }, (_, i) =>
      toLocalDateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
    );
    const weekSet = new Set(weekKeys);

    const trainedDays = new Set<string>();
    let workouts = 0;
    let seconds = 0;
    let xp = 0;

    for (const entry of history) {
      const key = toLocalDateKey(entry.concluido_em);
      if (!weekSet.has(key)) continue;
      trainedDays.add(key);
      workouts += 1;
      seconds += entry.duracao_total_segundos ?? 0;
      xp += entry.xp_ganho ?? 0;
    }

    const days: DayCell[] = weekKeys.map((key, i) => ({
      key,
      label: DAY_LABELS[i],
      trained: trainedDays.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    }));

    return { days, totals: { workouts, seconds, xp } };
  }, [history]);

  return (
    <section className="glass-card p-4">
      <h3 className="game-section-title">Sua semana</h3>

      <div className="mt-3 flex items-center justify-between gap-1" aria-hidden>
        {days.map((day) => (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`text-[0.55rem] font-extrabold ${day.isToday ? 'text-emerald-700' : 'text-stone-400'}`}
            >
              {day.label}
            </span>
            <span
              className={`h-7 w-7 rounded-lg border-2 ${
                day.trained
                  ? 'border-emerald-500 bg-emerald-400'
                  : day.isToday
                    ? 'border-dashed border-emerald-600 bg-emerald-50'
                    : day.isFuture
                      ? 'border-stone-200 bg-transparent'
                      : 'border-stone-200 bg-stone-100'
              }`}
            />
          </div>
        ))}
      </div>

      <p className="sr-only">
        {totals.workouts} treino{totals.workouts !== 1 ? 's' : ''} nesta semana
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center">
        <div>
          <p className="stat-number">{totals.workouts}</p>
          <p className="stat-label mt-1">Treinos</p>
        </div>
        <div>
          <p className="stat-number">
            {historyLoading ? '—' : formatTrainingDuration(totals.seconds)}
          </p>
          <p className="stat-label mt-1">Tempo</p>
        </div>
        <div>
          <p className="stat-number text-emerald-700">+{totals.xp}</p>
          <p className="stat-label mt-1">XP</p>
        </div>
      </div>
    </section>
  );
}
