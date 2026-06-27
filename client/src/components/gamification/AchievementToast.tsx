import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { SlimePortrait } from '@/components/afk/SlimePortrait';
import type { AchievementToastItem } from '@/lib/achievement-notifications';

const DISPLAY_MS = 4500;

interface Props {
  item: AchievementToastItem;
  stackIndex: number;
  onDismiss: (id: string) => void;
}

export function AchievementToast({ item, stackIndex, onDismiss }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [item.id, onDismiss]);

  const isEnemy = item.type === 'enemy';

  return (
    <motion.article
      layout
      className={`achievement-toast achievement-toast--${item.type}`}
      style={{ zIndex: 9999 - stackIndex }}
      initial={{ opacity: 0, x: 120, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 120, scale: 0.96 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320, mass: 0.85 }}
      role="status"
      aria-live="polite"
      aria-label={`${item.title} ${item.description}`}
    >
      <div className="achievement-toast__glow" aria-hidden />
      <div className="achievement-toast__icon-wrap">
        {isEnemy && item.enemyId ? (
          <SlimePortrait enemyId={item.enemyId} />
        ) : (
          <AchievementBadge icon={item.icon ?? 'trophy'} unlocked size={28} />
        )}
      </div>
      <div className="achievement-toast__copy">
        <p className="achievement-toast__title">{item.title}</p>
        <p className="achievement-toast__desc">{item.description}</p>
      </div>
    </motion.article>
  );
}
