import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import { actionHaptic } from '@/lib/platform/native-runtime';
import type { AchievementIcon } from '@/types';
import type { ActivityOccurrence } from '@shared/activities';

const SWIPE_THRESHOLD = 0.45;
const VELOCITY_THRESHOLD = 400;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [swiped, setSwiped] = useState(false);

  const x = useMotionValue(0);
  const checkOpacity = useTransform(x, [0, 80], [0, 1]);
  const checkScale = useTransform(x, [0, 80], [0.5, 1]);

  const canSwipe = !done && !busy && !swiped;

  return (
    <article
      ref={containerRef}
      className={`activity-quick-card${done ? ' activity-quick-card--done' : ''}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Swipe reveal trail */}
      {canSwipe && (
        <motion.div
          aria-hidden
          className="absolute inset-y-0 left-0 flex items-center pl-4"
          style={{
            opacity: checkOpacity,
            zIndex: 0,
            color: 'var(--accent-treino)',
          }}
        >
          <motion.span style={{ scale: checkScale }}>
            <Check size={22} strokeWidth={3} />
          </motion.span>
        </motion.div>
      )}

      <motion.div
        className="flex w-full items-center gap-3"
        style={{ x, position: 'relative', zIndex: 1, background: 'inherit' }}
        drag={canSwipe ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_event, info) => {
          const width = containerRef.current?.offsetWidth ?? 300;
          const movedEnough = info.offset.x > width * SWIPE_THRESHOLD;
          const fastEnough = info.velocity.x > VELOCITY_THRESHOLD && info.offset.x > width * 0.2;
          if (movedEnough || fastEnough) {
            setSwiped(true);
            void actionHaptic();
            onComplete();
          }
        }}
      >
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
      </motion.div>
    </article>
  );
}
