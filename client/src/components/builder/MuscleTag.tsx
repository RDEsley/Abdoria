import type { MusculoPrincipal } from '@/types';
import { MUSCULO_LABELS } from '@/types';

const MUSCLE_COLORS: Record<MusculoPrincipal, string> = {
  superior: 'bg-amber-100 text-amber-800 border-amber-200',
  inferior: 'bg-sky-100 text-sky-800 border-sky-200',
  obliquos: 'bg-violet-100 text-violet-800 border-violet-200',
  core: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completo: 'bg-rose-100 text-rose-800 border-rose-200',
};

const MUSCLE_SHORT: Record<MusculoPrincipal, string> = {
  superior: 'Sup.',
  inferior: 'Inf.',
  obliquos: 'Obl.',
  core: 'Core',
  completo: 'Full',
};

interface Props {
  muscle: MusculoPrincipal;
  compact?: boolean;
  className?: string;
}

/** Tag compacta de grupamento muscular — placeholder estruturado para futuras features. */
export function MuscleTag({ muscle, compact = false, className = '' }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.58rem] font-extrabold leading-none',
        MUSCLE_COLORS[muscle],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={MUSCULO_LABELS[muscle]}
    >
      {compact ? MUSCLE_SHORT[muscle] : MUSCULO_LABELS[muscle]}
    </span>
  );
}

interface GroupProps {
  muscles: MusculoPrincipal[];
  compact?: boolean;
  className?: string;
}

export function MuscleTagGroup({ muscles, compact = true, className = '' }: GroupProps) {
  if (muscles.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()} aria-label="Grupamentos musculares">
      {muscles.map((muscle) => (
        <MuscleTag key={muscle} muscle={muscle} compact={compact} />
      ))}
    </div>
  );
}
