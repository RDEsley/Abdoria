import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { formatTrainingDuration } from '@/lib/utils';
import { toLocalDateKey } from '@/lib/utils';
import { formatMetricas } from '@/lib/atividade-format';
import { getTodaySaoPaulo } from '@shared/utils/timezone';

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
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function ActivityCalendar() {
  const { history, ensureHistory, historyLoading, user } = useApp();
  const frozenSet = useMemo(
    () => new Set(user?.gamificacao?.streak_congelamentos ?? []),
    [user?.gamificacao?.streak_congelamentos],
  );
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [y, m] = getTodaySaoPaulo().split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const { cells, dayMeta, summary } = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const monthIndex = visibleMonth.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();

    const dayMeta = new Map<
      string,
      {
        count: number;
        treinos: number;
        minutes: number;
        workouts: string[];
        atividades: { nome: string; detalhe: string; obs?: string }[];
      }
    >();

    for (const entry of history) {
      const key = toLocalDateKey(entry.concluido_em);
      const [keyYear, keyMonth] = key.split('-').map(Number);
      if (keyYear !== year || keyMonth - 1 !== monthIndex) continue;
      const prev = dayMeta.get(key) ?? {
        count: 0,
        treinos: 0,
        minutes: 0,
        workouts: [],
        atividades: [],
      };
      const log = entry.atividade ?? null;

      dayMeta.set(key, {
        count: prev.count + 1,
        treinos: prev.treinos + (log ? 0 : 1),
        minutes: prev.minutes + Math.round((entry.duracao_total_segundos ?? 0) / 60),
        workouts: log ? prev.workouts : [...prev.workouts, entry.treino_nome ?? 'Treino'],
        atividades: log
          ? [
              ...prev.atividades,
              {
                nome: log.nome,
                detalhe: formatMetricas(log.metricas),
                ...(log.obs ? { obs: log.obs } : {}),
              },
            ]
          : prev.atividades,
      });
    }

    const cells: Array<{ date: string | null; day?: number; level: number }> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push({ date: null, level: 0 });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
      const meta = dayMeta.get(date);
      const count = meta?.count ?? 0;
      cells.push({ date, day, level: Math.min(count, 4) });
    }

    const totalWorkouts = [...dayMeta.values()].reduce((sum, item) => sum + item.count, 0);
    return { cells, dayMeta, summary: { activeDays: dayMeta.size, totalWorkouts } };
  }, [history, visibleMonth]);

  const selectedMeta = selectedDay ? dayMeta.get(selectedDay) : null;

  const shiftMonth = (delta: number) => {
    setSelectedDay(null);
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  if (historyLoading) {
    return <p className="text-sm text-stone-500">Carregando calendário...</p>;
  }

  if (history.length === 0) {
    return <p className="text-sm text-stone-500">Nenhum treino registrado ainda. Comece hoje!</p>;
  }

  return (
    <div className="workout-calendar">
      <div className="workout-calendar__header">
        <button
          type="button"
          className="workout-calendar__nav"
          onClick={() => shiftMonth(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="workout-calendar__month">
            {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </p>
          <p className="workout-calendar__summary">
            {summary.activeDays} dias ativos · {summary.totalWorkouts} treinos
          </p>
        </div>
        <button
          type="button"
          className="workout-calendar__nav"
          onClick={() => shiftMonth(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="workout-calendar__weekdays">
        {WEEKDAYS.map((label) => (
          <span key={label} className="workout-calendar__weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="workout-calendar__grid">
        {cells.map((cell, index) => {
          if (!cell.date || !cell.day) {
            return (
              <span
                key={`empty-${index}`}
                className="workout-calendar__cell workout-calendar__cell--empty"
              />
            );
          }
          const meta = dayMeta.get(cell.date);
          const isSelected = selectedDay === cell.date;
          const frozen = !meta && frozenSet.has(cell.date);
          return (
            <button
              key={cell.date}
              type="button"
              className={`workout-calendar__cell workout-calendar__cell--l${cell.level} ${frozen ? 'workout-calendar__cell--frozen' : ''} ${isSelected ? 'workout-calendar__cell--selected' : ''}`}
              onClick={() => setSelectedDay(cell.date)}
              title={
                frozen
                  ? 'Dia congelado — um Frozen Streak manteve a sequência (sem aumentar)'
                  : meta
                    ? `${meta.count} treino(s) · ${meta.minutes} min`
                    : 'Sem treinos'
              }
            >
              <span className="workout-calendar__day">{cell.day}</span>
              {cell.level > 0 && <span className="workout-calendar__dot" aria-hidden />}
              {frozen && <span className="workout-calendar__dot workout-calendar__dot--frozen" aria-hidden />}
            </button>
          );
        })}
      </div>

      {!selectedMeta && selectedDay && frozenSet.has(selectedDay) && (
        <div className="workout-calendar__detail">
          <p className="workout-calendar__detail-title">
            {selectedDay.split('-').reverse().join('/')} · Dia congelado ❄️
          </p>
          <p className="workout-calendar__detail-list">
            Um Frozen Streak foi usado: a sequência não zerou, mas também não aumentou.
          </p>
        </div>
      )}

      {selectedMeta && selectedDay && (
        <div className="workout-calendar__detail">
          <p className="workout-calendar__detail-title">
            {selectedDay.split('-').reverse().join('/')} ·{' '}
            {[
              selectedMeta.treinos > 0 ? `${selectedMeta.treinos} treino(s)` : null,
              selectedMeta.atividades.length > 0
                ? `${selectedMeta.atividades.length} atividade(s)`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}{' '}
            · {formatTrainingDuration(selectedMeta.minutes * 60)}
          </p>
          {selectedMeta.workouts.length > 0 && (
            <ul className="workout-calendar__detail-list">
              {selectedMeta.workouts.map((name, i) => (
                <li key={`${selectedDay}-t-${i}`}>{name}</li>
              ))}
            </ul>
          )}
          {selectedMeta.atividades.map((atividade, i) => (
            <div key={`${selectedDay}-a-${i}`} className="workout-calendar__atividade">
              <p className="workout-calendar__atividade-nome">
                {atividade.nome}
                {atividade.detalhe && (
                  <span className="workout-calendar__atividade-detalhe">{atividade.detalhe}</span>
                )}
              </p>
              {atividade.obs && (
                <p className="workout-calendar__atividade-obs">“{atividade.obs}”</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
