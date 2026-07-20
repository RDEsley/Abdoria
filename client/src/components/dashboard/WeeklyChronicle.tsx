import { useEffect, useMemo } from 'react';
import { Dumbbell, ListChecks, Minus, ScrollText, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { toLocalDateKey } from '@/lib/utils';
import { isAtividadeHistory } from '@shared/atividades';
import { addDaysSaoPaulo, getWeekStartSaoPaulo } from '@shared/utils/timezone';

interface WeekTotals {
  treinos: number;
  atividades: number;
  xp: number;
}

function weekDayKeys(mondayKey: string): Set<string> {
  return new Set(Array.from({ length: 7 }, (_, i) => addDaysSaoPaulo(mondayKey, i)));
}

/** Card narrativo comparando XP, treinos e atividades desta semana com a anterior. */
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

    const current: WeekTotals = { treinos: 0, atividades: 0, xp: 0 };
    const previous: WeekTotals = { treinos: 0, atividades: 0, xp: 0 };

    for (const entry of history) {
      const key = toLocalDateKey(entry.concluido_em);
      const bucket = currentKeys.has(key) ? current : previousKeys.has(key) ? previous : null;
      if (!bucket) continue;

      if (isAtividadeHistory(entry.treino_nome)) bucket.atividades += 1;
      else bucket.treinos += 1;
      bucket.xp += entry.xp_ganho ?? 0;
    }

    return { current, previous };
  }, [history]);

  if (historyLoading) {
    return <p className="text-sm text-stone-500">Escrevendo a crônica da semana...</p>;
  }

  const hasPrevious = previous.treinos > 0 || previous.atividades > 0 || previous.xp > 0;
  const treinosDelta = current.treinos - previous.treinos;
  const atividadesDelta = current.atividades - previous.atividades;
  const xpDeltaPct =
    previous.xp > 0 ? Math.round(((current.xp - previous.xp) / previous.xp) * 100) : null;

  let headline: string;
  let TrendIcon = Minus;
  let trendTone = 'bg-stone-100 text-stone-600';
  if (!hasPrevious) {
    headline =
      current.treinos > 0 || current.atividades > 0
        ? 'Capítulo de estreia da sua jornada!'
        : 'Uma nova crônica começa';
    trendTone = 'bg-sky-100 text-sky-700';
  } else if (xpDeltaPct === null || xpDeltaPct === 0) {
    headline = 'Ritmo constante';
  } else if (xpDeltaPct > 0) {
    headline = 'Semana em ascensão';
    TrendIcon = TrendingUp;
    trendTone = 'bg-emerald-100 text-emerald-700';
  } else {
    headline = 'Semana mais tranquila';
    TrendIcon = TrendingDown;
    trendTone = 'bg-amber-100 text-amber-700';
  }

  const deltaChip = (delta: number | null, suffix: string) => {
    if (!hasPrevious || delta === null) return null;
    if (delta === 0) {
      return (
        <span className="ml-auto shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[0.6rem] font-extrabold text-stone-500">
          = semana passada
        </span>
      );
    }
    const up = delta > 0;
    return (
      <span
        className={`ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
      >
        {up ? <TrendingUp size={11} aria-hidden /> : <TrendingDown size={11} aria-hidden />}
        {up ? '+' : ''}
        {delta}
        {suffix}
      </span>
    );
  };

  return (
    <section className="glass-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="game-section-title !mb-0 flex items-center gap-1.5">
          <ScrollText size={16} aria-hidden /> Crônica da semana
        </h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold ${trendTone}`}
        >
          <TrendIcon size={12} aria-hidden />
          {headline}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        <li className="flex items-center gap-2 rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Zap size={14} aria-hidden />
          </span>
          <span className="text-xs font-extrabold text-stone-700">+{current.xp} XP</span>
          {deltaChip(xpDeltaPct, '%')}
        </li>
        <li className="flex items-center gap-2 rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Dumbbell size={14} aria-hidden />
          </span>
          <span className="text-xs font-extrabold text-stone-700">
            {current.treinos} treino{current.treinos !== 1 ? 's' : ''}
          </span>
          {deltaChip(hasPrevious ? treinosDelta : null, '')}
        </li>
        {(current.atividades > 0 || previous.atividades > 0) && (
          <li className="flex items-center gap-2 rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <ListChecks size={14} aria-hidden />
            </span>
            <span className="text-xs font-extrabold text-stone-700">
              {current.atividades} atividade{current.atividades !== 1 ? 's' : ''}
            </span>
            {deltaChip(hasPrevious ? atividadesDelta : null, '')}
          </li>
        )}
      </ul>
    </section>
  );
}
