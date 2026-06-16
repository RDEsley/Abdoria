import type { MusculoPrincipal } from '@/types';
import { MUSCULO_HINTS, MUSCULO_LABELS } from '@/types';

interface Props {
  muscle: MusculoPrincipal;
  showHint?: boolean;
  hintOnly?: boolean;
  className?: string;
}

/** Rótulo de zona abdominal com subtítulo opcional. */
export function MuscleZoneLabel({ muscle, showHint = false, hintOnly = false, className = '' }: Props) {
  if (hintOnly) {
    return (
      <span className={`muscle-zone-hint ${className}`.trim()}>{MUSCULO_HINTS[muscle]}</span>
    );
  }

  return (
    <span className={`muscle-zone-label ${className}`.trim()}>
      <span className="muscle-zone-label__title">{MUSCULO_LABELS[muscle]}</span>
      {showHint && <span className="muscle-zone-hint">{MUSCULO_HINTS[muscle]}</span>}
    </span>
  );
}
