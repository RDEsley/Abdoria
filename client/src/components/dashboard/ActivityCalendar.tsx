import { cloneElement, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ActivityCalendar as ReactActivityCalendar, type Activity } from 'react-activity-calendar';
import { SwipeScroll } from '@/components/ui/SwipeScroll';
import { useApp } from '@/hooks/useApp';
import { toLocalDateKey } from '@/lib/utils';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function ActivityCalendar() {
  const { history, ensureHistory, historyLoading } = useApp();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const { data, dayMeta, summary, maxLevel } = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const monthIndex = visibleMonth.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const dayMeta = new Map<string, { count: number; minutes: number }>();

    for (const entry of history) {
      const date = new Date(entry.concluido_em);
      if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;
      const key = toLocalDateKey(entry.concluido_em);
      const prev = dayMeta.get(key) ?? { count: 0, minutes: 0 };
      dayMeta.set(key, {
        count: prev.count + 1,
        minutes: prev.minutes + Math.round((entry.duracao_total_segundos ?? 0) / 60),
      });
    }

    const data: Activity[] = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const meta = dayMeta.get(date);
      const count = meta?.count ?? 0;
      data.push({
        date,
        count,
        level: Math.min(count, 4) as 0 | 1 | 2 | 3 | 4,
      });
    }

    const totalWorkouts = [...dayMeta.values()].reduce((sum, item) => sum + item.count, 0);
    const maxLevel = Math.max(4, ...data.map((d) => d.level));

    return {
      data,
      dayMeta,
      summary: { activeDays: dayMeta.size, totalWorkouts },
      maxLevel,
    };
  }, [history, visibleMonth]);

  const shiftMonth = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  if (historyLoading) {
    return <p className="text-sm text-stone-500">Carregando calendário...</p>;
  }

  if (history.length === 0) {
    return <p className="text-sm text-stone-500">Nenhum treino registrado ainda. Comece hoje!</p>;
  }

  return (
    <div className="activity-calendar">
      <div className="activity-calendar__header">
        <button
          type="button"
          className="activity-calendar__nav"
          onClick={() => shiftMonth(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="activity-calendar__month">
            {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </p>
          <p className="activity-calendar__summary">
            {summary.activeDays} dias ativos · {summary.totalWorkouts} treinos
          </p>
        </div>
        <button
          type="button"
          className="activity-calendar__nav"
          onClick={() => shiftMonth(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <SwipeScroll className="pb-1" aria-label="Calendário de treinos" nextLabel="Ver mais do calendário">
        <ReactActivityCalendar
          data={data}
          maxLevel={maxLevel}
          showWeekdayLabels
          showMonthLabels={false}
          theme={{
            light: ['#e7e5e4', '#bbf7d0', '#86efac', '#34d399', '#059669'],
            dark: ['#e7e5e4', '#bbf7d0', '#86efac', '#34d399', '#059669'],
          }}
          colorScheme="light"
          blockSize={12}
          blockMargin={3}
          fontSize={12}
          labels={{
            weekdays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            legend: { less: 'Menos', more: 'Mais' },
            totalCount: '{{count}} treinos no mês',
          }}
          showTotalCount={false}
          renderBlock={(block, activity) => {
            const meta = dayMeta.get(activity.date);
            const title = meta
              ? `${meta.count} treino(s) · ${meta.minutes} min`
              : 'Sem treinos neste dia';
            return cloneElement(block, { title });
          }}
        />
      </SwipeScroll>

      <div className="activity-calendar__legend" aria-hidden>
        <span>Menos</span>
        {['#e7e5e4', '#bbf7d0', '#86efac', '#34d399', '#059669'].map((color) => (
          <span key={color} className="activity-calendar__legend-swatch" style={{ background: color }} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
