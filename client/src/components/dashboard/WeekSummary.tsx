import { useEffect, useMemo, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Flame, Snowflake } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { showGameToast } from '@/components/ui/GameToast';
import { formatTrainingDurationCompact } from '@/lib/utils';
import { toLocalDateKey } from '@/lib/utils';
import { addDaysSaoPaulo, getWeekStartSaoPaulo } from '@shared/utils/timezone';
import { FROZEN_STREAK_LABEL } from '@/types';
import { usePageEntranceReady } from '@/context/PageEntranceContext';

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

interface DayCell {
  key: string;
  label: string;
  trained: boolean;
  frozen: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Snapshot da semana corrente (segunda a domingo): dias treinados, total de
 * treinos, tempo e XP. Base do resumo semanal completo planejado na Fase 7.
 */
export function WeekSummary() {
  const pageReady = usePageEntranceReady();
  const reduceMotion = useReducedMotion();
  const { history, ensureHistory, historyLoading, user } = useApp();
  const frozenDays = user?.gamificacao?.streak_congelamentos;

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const { days, totals } = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const monday = getWeekStartSaoPaulo();

    const weekKeys = Array.from({ length: 7 }, (_, i) => addDaysSaoPaulo(monday, i));
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

    const frozenSet = new Set(frozenDays ?? []);
    const days: DayCell[] = weekKeys.map((key, i) => ({
      key,
      label: DAY_LABELS[i],
      trained: trainedDays.has(key),
      frozen: !trainedDays.has(key) && frozenSet.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    }));

    return { days, totals: { workouts, seconds, xp } };
  }, [history, frozenDays]);

  return (
    <section className="glass-card dashboard-surface dashboard-surface--streak p-4">
      <h3 className="game-section-title">Sua semana</h3>

      <div className="mt-3 flex items-center justify-between gap-1">
        {days.map((day, index) => (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`text-[0.55rem] font-extrabold ${day.isToday ? 'text-emerald-700' : 'text-stone-400'}`}
              aria-hidden
            >
              {day.label}
            </span>
            {day.frozen ? (
              <button
                type="button"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border-2 border-sky-400 bg-sky-300"
                title={`Dia congelado — um ${FROZEN_STREAK_LABEL} foi usado`}
                aria-label={`Dia congelado por ${FROZEN_STREAK_LABEL}`}
                onClick={() =>
                  showGameToast(
                    `Um ${FROZEN_STREAK_LABEL} foi usado neste dia: a sequência não zerou, mas também não aumentou.`,
                    { variant: 'info' },
                  )
                }
              >
                <Snowflake size={14} className="text-sky-700" aria-hidden />
              </button>
            ) : (
              <motion.span
                aria-hidden
                title={
                  day.trained
                    ? 'Dia treinado'
                    : day.isToday
                      ? 'Hoje — ainda dá tempo de treinar'
                      : day.isFuture
                        ? 'Dia futuro'
                        : 'Dia sem treino'
                }
                className={`week-summary-day flex h-7 w-7 items-center justify-center rounded-lg border-2 ${
                  day.trained
                    ? 'week-summary-day--complete border-emerald-500 bg-emerald-400'
                    : day.isToday
                      ? 'border-dashed border-emerald-600 bg-emerald-50'
                      : day.isFuture
                        ? 'border-stone-200 bg-transparent'
                        : 'border-stone-200 bg-stone-100'
                }`}
                initial={
                  day.trained && !reduceMotion ? { scale: 0.35, rotate: -24, opacity: 0 } : false
                }
                animate={
                  day.trained && !reduceMotion && !pageReady
                    ? { scale: 0.35, rotate: -24, opacity: 0 }
                    : { scale: 1, rotate: 0, opacity: 1 }
                }
                transition={{
                  type: 'spring',
                  stiffness: 460,
                  damping: 18,
                  delay: day.trained ? 0.06 + index * 0.055 : 0,
                }}
              >
                {day.trained && <Check size={14} className="text-white" strokeWidth={3} />}
                {!day.trained && day.isToday && <Flame size={13} className="text-emerald-600" />}
              </motion.span>
            )}
          </div>
        ))}
      </div>

      <p className="sr-only">
        {totals.workouts} treino{totals.workouts !== 1 ? 's' : ''} nesta semana
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center">
        <div>
          <p
            className="stat-number"
            style={{ '--val-len': String(totals.workouts).length } as CSSProperties}
          >
            {totals.workouts}
          </p>
          <p className="stat-label mt-1">Treinos</p>
        </div>
        <div>
          {(() => {
            const tempo = historyLoading ? '—' : formatTrainingDurationCompact(totals.seconds);
            return (
              <p className="stat-number" style={{ '--val-len': tempo.length } as CSSProperties}>
                {tempo}
              </p>
            );
          })()}
          <p className="stat-label mt-1">Tempo</p>
        </div>
        <div>
          <p
            className="stat-number text-emerald-700"
            style={{ '--val-len': String(totals.xp).length + 1 } as CSSProperties}
          >
            +{totals.xp}
          </p>
          <p className="stat-label mt-1">XP</p>
        </div>
      </div>
    </section>
  );
}
