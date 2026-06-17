import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { playStreak } from '@/lib/sounds';

interface Props {
  streak: number;
}

const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (i % 7) * 14 - 42 + (i % 3) * 4,
  delay: 0.45 + (i % 5) * 0.06,
  size: 4 + (i % 3),
}));

/** Fogo acendendo ao estender o streak — inspirado no ritual do Duolingo. */
export function StreakFireCelebration({ streak }: Props) {
  const label = useMemo(
    () => (streak === 1 ? 'Primeiro dia seguido!' : `${streak} dias seguidos treinando!`),
    [streak],
  );

  useEffect(() => {
    const t = window.setTimeout(() => playStreak(), 280);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="streak-fire-celebration" aria-live="polite">
      <motion.div
        className="streak-fire-celebration__burst"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.8, 1.4], opacity: [0, 0.85, 0] }}
        transition={{ duration: 0.75, times: [0, 0.35, 1], ease: 'easeOut' }}
      />

      <div className="streak-fire-celebration__flame-wrap">
        <motion.div
          className="streak-fire-celebration__flame streak-fire-celebration__flame--cold"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.35, delay: 0.15, ease: 'easeIn' }}
          aria-hidden
        >
          <span className="streak-fire-celebration__flame-core" />
          <span className="streak-fire-celebration__flame-mid" />
          <span className="streak-fire-celebration__flame-outer" />
        </motion.div>

        <motion.div
          className="streak-fire-celebration__flame streak-fire-celebration__flame--lit"
          initial={{ opacity: 0, scale: 0.35, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.22 }}
        >
          <span className="streak-fire-celebration__flame-core" />
          <span className="streak-fire-celebration__flame-mid" />
          <span className="streak-fire-celebration__flame-outer" />
        </motion.div>

        {EMBERS.map((ember) => (
          <motion.span
            key={ember.id}
            className="streak-fire-celebration__ember"
            style={{ width: ember.size, height: ember.size, left: `calc(50% + ${ember.x}px)` }}
            initial={{ opacity: 0, y: 8, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              y: [8, -28 - (ember.id % 4) * 12],
              x: [(ember.id % 2 === 0 ? -1 : 1) * (4 + ember.id % 5)],
              scale: [0, 1, 0.3],
            }}
            transition={{ duration: 0.9, delay: ember.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      <motion.div
        className="streak-fire-celebration__count"
        initial={{ opacity: 0, scale: 0.5, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.55 }}
      >
        <span className="streak-fire-celebration__count-value">{streak}</span>
        <span className="streak-fire-celebration__count-unit">d</span>
      </motion.div>

      <motion.p
        className="streak-fire-celebration__label"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.72, duration: 0.35 }}
      >
        {label}
      </motion.p>
    </div>
  );
}
