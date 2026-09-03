import { ArrowUp, ArrowDown, Minus, Trophy, X } from 'lucide-react';

interface WeekRetro {
  active_days: number;
  active_days_prev: number;
  workouts: number;
  workouts_prev: number;
  activities: number;
  activities_prev: number;
  xp: number;
  xp_prev: number;
  best_day: string | null;
  best_day_xp: number;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-emerald-600">
        <ArrowUp size={12} /> +{diff}
      </span>
    );
  if (diff < 0)
    return (
      <span className="flex items-center gap-0.5 text-rose-500">
        <ArrowDown size={12} /> {diff}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-stone-400">
      <Minus size={12} /> =
    </span>
  );
}

export function WeekRetroCard({ retro, onDismiss }: { retro: WeekRetro; onDismiss?: () => void }) {
  const stats = [
    { label: 'Dias ativos', value: retro.active_days, prev: retro.active_days_prev },
    { label: 'Treinos', value: retro.workouts, prev: retro.workouts_prev },
    { label: 'Atividades', value: retro.activities, prev: retro.activities_prev },
    { label: 'XP', value: retro.xp, prev: retro.xp_prev },
  ];

  return (
    <section className="glass-card glass-card--streak p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-800">
          <Trophy size={16} className="text-amber-500" /> Esta semana · seg–dom
        </h3>
        <button
          type="button"
          className="game-icon-btn"
          aria-label="Dispensar retrospectiva"
          onClick={onDismiss}
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white/60 p-2">
            <p className="text-[0.6rem] font-bold uppercase text-stone-500">{s.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-stone-800">{s.value}</span>
              <span className="text-[0.6rem] font-bold">
                <Delta current={s.value} previous={s.prev} />
              </span>
            </div>
          </div>
        ))}
      </div>
      {retro.best_day && (
        <p className="mt-2 text-[0.65rem] font-bold text-stone-500">
          ⭐ Melhor dia: {retro.best_day} com {retro.best_day_xp} XP
        </p>
      )}
    </section>
  );
}
