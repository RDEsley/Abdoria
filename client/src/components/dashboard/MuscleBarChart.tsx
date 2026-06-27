import type { MusculoPrincipal } from '@/types';
import { MuscleZoneLabel } from '@/components/library/MuscleZoneLabel';

interface Props {
  muscles: Record<MusculoPrincipal, number>;
}

const MUSCLE_ORDER: MusculoPrincipal[] = ['superior', 'inferior', 'obliquos', 'core', 'completo'];

export function MuscleBarChart({ muscles }: Props) {
  const maxMuscle = Math.max(...Object.values(muscles), 1);
  const entries = MUSCLE_ORDER.map((muscle) => ({ muscle, count: muscles[muscle] }));
  const mostTrained = entries.reduce((best, item) => (item.count > best.count ? item : best), entries[0]);
  const leastTrained = entries
    .filter((item) => item.count > 0)
    .reduce((best, item) => (item.count < best.count ? item : best), mostTrained);

  return (
    <div className="muscle-bar-chart flex flex-col gap-5">
      <div className="muscle-bar-chart__chips flex flex-wrap gap-2">
        {mostTrained.count > 0 && (
          <span className="muscle-bar-chart__chip muscle-bar-chart__chip--most">
            Mais treinada: <MuscleZoneLabel muscle={mostTrained.muscle} />
          </span>
        )}
        {leastTrained && leastTrained.count > 0 && leastTrained.muscle !== mostTrained.muscle && (
          <span className="muscle-bar-chart__chip muscle-bar-chart__chip--least">
            Menos treinada: <MuscleZoneLabel muscle={leastTrained.muscle} />
          </span>
        )}
      </div>

      <div className="muscle-bar-chart__bars flex flex-col gap-3">
        {MUSCLE_ORDER.map((muscle) => {
          const count = muscles[muscle];
          const pct = (count / maxMuscle) * 100;
          const isMost = muscle === mostTrained.muscle && count > 0;
          const isLeast = muscle === leastTrained?.muscle && count > 0 && muscle !== mostTrained.muscle;
          return (
            <div key={muscle} className="muscle-bar-chart__row">
              <div className="mb-1.5 flex items-start justify-between gap-2 text-xs">
                <MuscleZoneLabel muscle={muscle} showHint />
                <span className="shrink-0 font-bold text-stone-500">{count}x</span>
              </div>
              <div className="muscle-bar-chart__track h-2.5 overflow-hidden rounded-full bg-stone-200">
                <div
                  className={`muscle-bar-chart__fill h-full rounded-full transition-all ${
                    isMost ? 'bg-emerald-600' : isLeast ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
