import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/hooks/useApp';
import { toLocalDateKey } from '@/lib/utils';

const WEEKS = 53;
const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

interface DayCell {
  key: string;
  day: number;
  level: number;
  count: number;
  isFuture: boolean;
  monthLabel: string | null;
}

/** Heatmap de consistência (estilo grafo de contribuições), últimas 53 semanas. */
export function ConsistencyHeatmap() {
  const { history, ensureHistory, historyLoading } = useApp();
  const [selected, setSelected] = useState<DayCell | null>(null);

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const { columns, activeDays, totalWorkouts } = useMemo(() => {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const mondayOffset = (now.getDay() + 6) % 7;
    const currentMonday = addDays(now, -mondayOffset);
    const startMonday = addDays(currentMonday, -(WEEKS - 1) * 7);

    const dayCounts = new Map<string, number>();
    for (const entry of history) {
      const key = toLocalDateKey(entry.concluido_em);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }

    let lastMonth = -1;
    const columns: DayCell[][] = [];
    for (let w = 0; w < WEEKS; w += 1) {
      const weekStart = addDays(startMonday, w * 7);
      const days: DayCell[] = Array.from({ length: 7 }, (_, d) => {
        const date = addDays(weekStart, d);
        const key = toLocalDateKey(date);
        const count = dayCounts.get(key) ?? 0;
        const month = date.getMonth();
        const monthLabel = d === 0 && month !== lastMonth ? MONTH_LABELS[month] : null;
        if (d === 0) lastMonth = month;
        return {
          key,
          day: date.getDate(),
          level: Math.min(count, 4),
          count,
          isFuture: key > todayKey,
          monthLabel,
        };
      });
      columns.push(days);
    }

    return {
      columns,
      activeDays: dayCounts.size,
      totalWorkouts: [...dayCounts.values()].reduce((sum, c) => sum + c, 0),
    };
  }, [history]);

  if (historyLoading) {
    return <p className="text-sm text-stone-500">Carregando mapa de campanha...</p>;
  }

  if (history.length === 0) {
    return <p className="text-sm text-stone-500">Nenhum treino registrado ainda. Comece hoje!</p>;
  }

  return (
    <div className="consistency-heatmap">
      <p className="consistency-heatmap__summary">
        {activeDays} dias ativos · {totalWorkouts} treinos nas últimas {WEEKS} semanas
      </p>

      <div className="consistency-heatmap__scroll">
        <div className="consistency-heatmap__grid">
          {columns.map((days, w) => (
            <div key={w} className="consistency-heatmap__col">
              <span className="consistency-heatmap__month">{days[0].monthLabel ?? ''}</span>
              {days.map((cell) => (
                <button
                  key={cell.key}
                  type="button"
                  disabled={cell.isFuture}
                  onClick={() => setSelected(cell)}
                  title={`${cell.key.split('-').reverse().join('/')} · ${cell.count} treino(s)`}
                  className={`consistency-heatmap__cell consistency-heatmap__cell--l${cell.isFuture ? 'future' : cell.level}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="consistency-heatmap__legend">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`consistency-heatmap__cell consistency-heatmap__cell--l${level}`}
          />
        ))}
        <span>Mais</span>
      </div>

      {selected && (
        <p className="consistency-heatmap__detail">
          {selected.key.split('-').reverse().join('/')} · {selected.count} treino(s)
        </p>
      )}
    </div>
  );
}
