import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import type { AchievementToastItem } from '@/lib/achievement-notifications';
import { successHaptic } from '@/lib/platform/native-runtime';

const DISPLAY_MS = 4500;

interface Props {
  item: AchievementToastItem;
  stackIndex: number;
  onDismiss: (id: string) => void;
}

export function AchievementToast({ item, stackIndex, onDismiss }: Props) {
  const hapticSentRef = useRef(false);

  useEffect(() => {
    if (!hapticSentRef.current) {
      hapticSentRef.current = true;
      void successHaptic();
    }
    const timer = window.setTimeout(() => onDismiss(item.id), DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <motion.article
      layout
      className={`achievement-toast achievement-toast--${item.type}`}
      style={{ zIndex: 9999 - stackIndex, cursor: 'pointer' }}
      initial={{ opacity: 0, x: 120, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.94, transition: { duration: 0.15, ease: 'easeIn' } }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320, mass: 0.85 }}
      role="status"
      aria-live="polite"
      aria-label={`${item.title} ${item.description}. Toque para dispensar.`}
      onClick={() => onDismiss(item.id)}
    >
      <div className="achievement-toast__glow" aria-hidden />
      <div className="achievement-toast__icon-wrap">
        <AchievementBadge icon={item.icon ?? 'trophy'} unlocked size={28} />
      </div>
      <div className="achievement-toast__copy">
        <p className="achievement-toast__title">{item.title}</p>
        <p className="achievement-toast__desc">{item.description}</p>
      </div>
    </motion.article>
  );
}
