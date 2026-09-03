import { Check } from 'lucide-react';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import type { AchievementIcon } from '@/types';
import type { ActivityOccurrence } from '@shared/activities';

export function ActivityQuickCard({
  occurrence,
  busy,
  onComplete,
  onDetails,
}: {
  occurrence: ActivityOccurrence;
  busy?: boolean;
  onComplete: () => void;
  onDetails: () => void;
}) {
  const Icon =
    ACHIEVEMENT_ICON_COMPONENTS[occurrence.icon as AchievementIcon] ??
    ACHIEVEMENT_ICON_COMPONENTS.star;
  const done = occurrence.status === 'done';

  return (
    <article className={`activity-quick-card${done ? ' activity-quick-card--done' : ''}`}>
      <button
        type="button"
        className="activity-quick-card__check"
        aria-label={done ? `${occurrence.name} concluída` : `Concluir ${occurrence.name}`}
        disabled={busy || done}
        onClick={onComplete}
      >
        {done ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
      </button>
      <div className="activity-quick-card__body">
        <strong>{occurrence.name}</strong>
        <small>{occurrence.time ?? 'Quando quiser'}</small>
      </div>
      {!done && (
        <button type="button" className="activity-quick-card__details" onClick={onDetails}>
          Detalhes
        </button>
      )}
    </article>
  );
}
