import {
  ArrowDownCircle,
  ArrowUpCircle,
  MoveHorizontal,
  Anchor,
  PersonStanding,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { MusculoPrincipal } from '@/types';
import { MUSCULO_TAG_LABELS } from '@/types';
import { usePageEntranceReady } from '@/hooks/usePageEntranceReady';

interface Props {
  muscles: Record<MusculoPrincipal, number>;
}

const MUSCLE_ORDER: MusculoPrincipal[] = ['superior', 'inferior', 'obliquos', 'core', 'completo'];

const MUSCLE_ICONS: Record<MusculoPrincipal, LucideIcon> = {
  superior: ArrowUpCircle,
  inferior: ArrowDownCircle,
  obliquos: MoveHorizontal,
  core: Anchor,
  completo: PersonStanding,
};

export function MuscleBarChart({ muscles }: Props) {
  const pageReady = usePageEntranceReady();
  const total = Object.values(muscles).reduce((sum, count) => sum + count, 0);
  const maxMuscle = Math.max(...Object.values(muscles), 1);
  const entries = MUSCLE_ORDER.map((muscle) => ({ muscle, count: muscles[muscle] }));
  const mostTrained = entries.reduce(
    (best, item) => (item.count > best.count ? item : best),
    entries[0],
  );
  const leastTrained = entries
    .filter((item) => item.count > 0)
    .reduce((best, item) => (item.count < best.count ? item : best), mostTrained);

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-5 text-center">
        <PersonStanding className="mx-auto text-emerald-600" size={24} aria-hidden />
        <p className="mt-2 text-sm font-extrabold text-stone-700">
          Seu mapa começa no próximo treino
        </p>
        <p className="mt-1 text-xs font-semibold text-stone-500">
          Conclua um treino para revelar o equilíbrio dos estímulos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mostTrained.count > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[0.65rem] font-extrabold text-emerald-800">
            <TrendingUp size={12} aria-hidden />
            {MUSCULO_TAG_LABELS[mostTrained.muscle]}
          </span>
          {leastTrained && leastTrained.muscle !== mostTrained.muscle && (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[0.65rem] font-extrabold text-stone-600">
              <TrendingDown size={12} aria-hidden />
              {MUSCULO_TAG_LABELS[leastTrained.muscle]}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {MUSCLE_ORDER.map((muscle) => {
          const count = muscles[muscle];
          const pct = (count / maxMuscle) * 100;
          const isMost = muscle === mostTrained.muscle && count > 0;
          const isLeast =
            muscle === leastTrained?.muscle && count > 0 && muscle !== mostTrained.muscle;
          const Icon = MUSCLE_ICONS[muscle];
          return (
            <div key={muscle} className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  isMost
                    ? 'bg-emerald-100 text-emerald-700'
                    : isLeast
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-stone-100 text-stone-500'
                }`}
              >
                <Icon size={14} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-bold text-stone-700">
                    {MUSCULO_TAG_LABELS[muscle]}
                  </span>
                  <span className="shrink-0 font-bold text-stone-400">{count}x</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isMost ? 'bg-emerald-600' : isLeast ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: pageReady ? `${pct}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
