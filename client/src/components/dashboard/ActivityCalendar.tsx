import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, Snowflake, Sparkles } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { formatTrainingDuration } from '@/lib/utils';
import { toLocalDateKey } from '@/lib/utils';
import { formatMetricas } from '@/lib/atividade-format';
import { getTodaySaoPaulo, addDaysSaoPaulo } from '@shared/utils/timezone';
import { ATIVIDADES_MIN_DESCANSO } from '@shared/atividades';

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

const swapTransition = { duration: 0.18, ease: 'easeOut' as const };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function ActivityCalendar() {
  const { history, ensureHistory, historyLoading, user } = useApp();
  const frozenSet = useMemo(
    () => new Set(user?.gamificacao?.streak_congelamentos ?? []),
    [user?.gamificacao?.streak_congelamentos],
  );

  /** Sequência do streak NO DIA (não é o streak_atual de hoje) — anda por
      todo o histórico em ordem cronológica: treino ou 3+ atividades no dia
      incrementa; dia congelado sustenta sem incrementar; qualquer outro dia
      zera. Aproximação client-side da regra real (ver shared/atividades.ts),
      boa o bastante pra exibição do calendário. */
  const streakAtDay = useMemo(() => {
    const perDay = new Map<string, { treinos: number; atividades: number }>();
    for (const entry of history) {
      const key = toLocalDateKey(entry.concluido_em);
      const prev = perDay.get(key) ?? { treinos: 0, atividades: 0 };
      if (entry.atividade) prev.atividades += 1;
      else prev.treinos += 1;
      perDay.set(key, prev);
    }

    const status = new Map<string, 'active' | 'frozen'>();
    for (const [key, v] of perDay) {
      if (v.treinos > 0 || v.atividades >= ATIVIDADES_MIN_DESCANSO) status.set(key, 'active');
    }
    for (const key of frozenSet) {
      if (!status.has(key)) status.set(key, 'frozen');
    }
    if (status.size === 0) return new Map<string, number>();

    const keys = [...status.keys()].sort();
    const lastKey = keys[keys.length - 1]!;
    const result = new Map<string, number>();
    let running = 0;
    let cursor = keys[0]!;
    while (true) {
      const state = status.get(cursor);
      if (state === 'active') {
        running += 1;
        result.set(cursor, running);
      } else if (state === 'frozen') {
        if (running > 0) result.set(cursor, running);
      } else {
        running = 0;
      }
      if (cursor === lastKey) break;
      cursor = addDaysSaoPaulo(cursor, 1);
    }
    return result;
  }, [history, frozenSet]);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [y, m] = getTodaySaoPaulo().split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Mede a altura real da grade do calendário (varia com a largura da tela e
  // com o número de semanas do mês) e trava essa altura no card — sem isso,
  // abrir o detalhe de um dia com pouco conteúdo encolhia o card inteiro,
  // e ele "pulava" de tamanho de novo ao voltar pro calendário.
  const calendarViewRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);

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
  const selectedFrozen = !selectedMeta && !!selectedDay && frozenSet.has(selectedDay);

  useLayoutEffect(() => {
    if (selectedDay !== null) return undefined;
    const el = calendarViewRef.current;
    if (!el) return undefined;

    const measure = () => setMinHeight(el.getBoundingClientRect().height);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [selectedDay, cells]);

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
    <div className="workout-calendar" style={{ minHeight }}>
      <AnimatePresence mode="wait" initial={false}>
        {selectedDay ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={swapTransition}
          >
            <div className="workout-calendar__header">
              <button
                type="button"
                className="workout-calendar__nav"
                onClick={() => setSelectedDay(null)}
                aria-label="Voltar ao calendário"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="workout-calendar__month">
                {selectedDay.split('-').reverse().join('/')}
              </p>
              <span className="workout-calendar__nav workout-calendar__nav--ghost" aria-hidden />
            </div>

            {selectedFrozen && (
              <div className="workout-calendar__day-detail">
                <p className="workout-calendar__detail-title">
                  <Snowflake size={14} className="text-sky-600" aria-hidden /> Dia congelado
                </p>
                <p className="workout-calendar__detail-list">
                  Um Frozen Streak foi usado: a sequência não zerou, mas também não aumentou.
                </p>
              </div>
            )}

            {selectedMeta && (
              <div className="workout-calendar__day-detail">
                <p className="workout-calendar__detail-title">
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
                        <span className="workout-calendar__atividade-detalhe">
                          {atividade.detalhe}
                        </span>
                      )}
                    </p>
                    {atividade.obs && (
                      <p className="workout-calendar__atividade-obs">“{atividade.obs}”</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!selectedMeta && !selectedFrozen && (
              <div className="workout-calendar__day-detail">
                <p className="workout-calendar__detail-list">
                  Nenhum treino ou atividade registrado neste dia.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            ref={calendarViewRef}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={swapTransition}
          >
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
                const frozen = !meta && frozenSet.has(cell.date);
                const hasTreino = (meta?.treinos ?? 0) > 0;
                const hasAtividade = (meta?.atividades.length ?? 0) > 0;
                const streakNum = streakAtDay.get(cell.date);
                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={`workout-calendar__cell ${cell.level > 0 ? 'workout-calendar__cell--active' : ''} ${frozen ? 'workout-calendar__cell--frozen' : ''}`}
                    onClick={() => setSelectedDay(cell.date)}
                    title={
                      frozen
                        ? 'Dia congelado — um Frozen Streak manteve a sequência (sem aumentar)'
                        : meta
                          ? `${meta.count} treino(s) · ${meta.minutes} min${streakNum ? ` · streak ${streakNum}` : ''}`
                          : 'Sem treinos'
                    }
                  >
                    {frozen ? (
                      <span className="workout-calendar__cell-icon" aria-hidden>
                        <Snowflake size={14} />
                      </span>
                    ) : hasTreino ? (
                      <span className="workout-calendar__cell-icon" aria-hidden>
                        <Flame
                          size={14}
                          className="workout-calendar__cell-flame"
                          fill="currentColor"
                        />
                      </span>
                    ) : hasAtividade ? (
                      <span className="workout-calendar__cell-icon" aria-hidden>
                        <Sparkles size={14} />
                      </span>
                    ) : (
                      <span className="workout-calendar__day">{cell.day}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
