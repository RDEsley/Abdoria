import { useEffect, useMemo } from 'react';
import { Minus, ScrollText, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { toLocalDateKey } from '@/lib/utils';
import { addDaysSaoPaulo, getWeekStartSaoPaulo } from '@shared/utils/timezone';

interface WeekTotals {
  workouts: number;
  xp: number;
}

function weekDayKeys(mondayKey: string): Set<string> {
  return new Set(Array.from({ length: 7 }, (_, i) => addDaysSaoPaulo(mondayKey, i)));
}

/** Card narrativo comparando XP e treinos desta semana com a semana anterior. */
export function WeeklyChronicle() {
  const { history, ensureHistory, historyLoading } = useApp();

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const { current, previous } = useMemo(() => {
    const currentMonday = getWeekStartSaoPaulo();
    const previousMonday = addDaysSaoPaulo(currentMonday, -7);

    const currentKeys = weekDayKeys(currentMonday);
    const previousKeys = weekDayKeys(previousMonday);

    const current: WeekTotals = { workouts: 0, xp: 0 };
    const previous: WeekTotals = { workouts: 0, xp: 0 };

    for (const entry of history) {
      const key = toLocalDateKey(entry.concluido_em);
      if (currentKeys.has(key)) {
        current.workouts += 1;
        current.xp += entry.xp_ganho ?? 0;
      } else if (previousKeys.has(key)) {
        previous.workouts += 1;
        previous.xp += entry.xp_ganho ?? 0;
      }
    }

    return { current, previous };
  }, [history]);

  if (historyLoading) {
    return <p className="text-sm text-stone-500">Escrevendo a crônica da semana...</p>;
  }

  const hasPrevious = previous.workouts > 0 || previous.xp > 0;
  const workoutsDelta = current.workouts - previous.workouts;
  const xpDeltaPct =
    previous.xp > 0 ? Math.round(((current.xp - previous.xp) / previous.xp) * 100) : null;

  let headline: string;
  let TrendIcon = Minus;
  if (!hasPrevious) {
    headline =
      current.workouts > 0 ? 'Capítulo de estreia da sua jornada!' : 'Uma nova crônica começa';
  } else if (xpDeltaPct === null || xpDeltaPct === 0) {
    headline = 'Ritmo constante em relação à semana passada';
  } else if (xpDeltaPct > 0) {
    headline = 'Crônica em ascensão';
    TrendIcon = TrendingUp;
  } else {
    headline = 'Semana mais tranquila';
    TrendIcon = TrendingDown;
  }

  const xpLine = !hasPrevious
    ? `+${current.xp} XP nesta semana — sem semana anterior pra comparar`
    : xpDeltaPct === null || xpDeltaPct === 0
      ? `+${current.xp} XP · mesmo ritmo da semana passada`
      : `+${current.xp} XP · ${xpDeltaPct > 0 ? '+' : ''}${xpDeltaPct}% vs. semana passada`;

  const workoutsLine = !hasPrevious
    ? `${current.workouts} treino(s)`
    : workoutsDelta === 0
      ? `${current.workouts} treino(s) · igual à semana passada`
      : `${current.workouts} treino(s) · ${workoutsDelta > 0 ? '+' : ''}${workoutsDelta} vs. semana passada`;

  return (
    <section className="glass-card p-4">
      <h3 className="game-section-title flex items-center gap-1.5">
        <ScrollText size={16} aria-hidden /> Crônica da semana
      </h3>
      <p className="mt-2 flex items-center gap-1.5 text-sm font-extrabold text-stone-800">
        <TrendIcon size={16} aria-hidden className="shrink-0" />
        {headline}
      </p>
      <ul className="mt-3 space-y-1 text-xs font-bold text-stone-500">
        <li>{xpLine}</li>
        <li>{workoutsLine}</li>
      </ul>
    </section>
  );
}
