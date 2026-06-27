import type { MusculoPrincipal } from '@/types';
import { MUSCULO_HINTS, MUSCULO_LABELS, MUSCULO_TAG_LABELS } from '@/types';

const MUSCLE_COLORS: Record<MusculoPrincipal, string> = {
  superior: 'bg-amber-100 text-amber-800 border-amber-200',
  inferior: 'bg-sky-100 text-sky-800 border-sky-200',
  obliquos: 'bg-violet-100 text-violet-800 border-violet-200',
  core: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completo: 'bg-rose-100 text-rose-800 border-rose-200',
};

interface Props {
  muscle: MusculoPrincipal;
  compact?: boolean;
  className?: string;
}

/** Tag de zona abdominal — compacta usa rótulo curto legível; expandida usa nome completo. */
export function MuscleTag({ muscle, compact = false, className = '' }: Props) {
  const label = compact ? MUSCULO_TAG_LABELS[muscle] : MUSCULO_LABELS[muscle];

  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-1.5 py-0.5 font-extrabold leading-snug',
        compact ? 'text-[0.62rem]' : 'text-[0.68rem]',
        MUSCLE_COLORS[muscle],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={MUSCULO_HINTS[muscle]}
    >
      {label}
    </span>
  );
}

interface GroupProps {
  muscles: MusculoPrincipal[];
  compact?: boolean;
  className?: string;
}

export function MuscleTagGroup({ muscles, compact = false, className = '' }: GroupProps) {
  if (muscles.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()} aria-label="Zonas do abdômen">
      {muscles.map((muscle) => (
        <MuscleTag key={muscle} muscle={muscle} compact={compact} />
      ))}
    </div>
  );
}
