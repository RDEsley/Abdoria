import type { MusculoPrincipal } from '@/types';
import { MuscleZoneLabel } from '@/components/library/MuscleZoneLabel';

interface Props {
  muscles: Record<MusculoPrincipal, number>;
  monthly: { mes: string; minutos: number }[];
}

const MUSCLE_ORDER: MusculoPrincipal[] = ['superior', 'inferior', 'obliquos', 'core', 'completo'];

export function MuscleBarChart({ muscles, monthly }: Props) {
  const maxMuscle = Math.max(...Object.values(muscles), 1);
  const maxMonthly = Math.max(...monthly.map((m) => m.minutos), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {MUSCLE_ORDER.map((muscle) => {
          const count = muscles[muscle];
          const pct = (count / maxMuscle) * 100;
          return (
            <div key={muscle}>
              <div className="mb-1 flex items-start justify-between gap-2 text-xs">
                <MuscleZoneLabel muscle={muscle} showHint />
                <span className="shrink-0 text-stone-400">{count}x</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {monthly.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-stone-500">Evolução mensal (minutos)</p>
          <div className="flex h-24 items-end gap-2">
            {monthly.map((m) => (
              <div key={m.mes} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-sky-400"
                  style={{ height: `${(m.minutos / maxMonthly) * 100}%`, minHeight: m.minutos > 0 ? 4 : 0 }}
                  title={`${m.minutos} min`}
                />
                <span className="text-[9px] text-stone-400">{m.mes.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
