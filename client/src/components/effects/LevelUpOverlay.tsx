import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { playLevelUp } from '@/lib/sounds';

interface Props {
  level: number;
  onDone: () => void;
}

const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  angle: i * 22.5,
  delay: 0.3 + (i % 4) * 0.05,
  distance: 46 + (i % 3) * 14,
}));

export function LevelUpOverlay({ level, onDone }: Props) {
  useEffect(() => {
    const t = window.setTimeout(() => playLevelUp(), 180);
    const done = window.setTimeout(onDone, 2800);
    return () => {
      clearTimeout(t);
      clearTimeout(done);
    };
  }, [level, onDone]);

  return createPortal(
    <div
      className="level-up-overlay"
      role="dialog"
      aria-live="assertive"
      aria-label={`Subiu para o nível ${level}`}
    >
      <motion.div
        className="level-up-overlay__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="level-up-overlay__card"
        initial={{ scale: 0.4, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      >
        <motion.div
          className="level-up-overlay__rays"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        />

        <p className="level-up-overlay__label">LEVEL UP!</p>

        <div className="level-up-overlay__medal-wrap">
          <motion.div
            className="level-up-overlay__pulse"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            aria-hidden
          />
          <motion.div
            className="level-up-overlay__medal"
            initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 }}
          >
            <Crown size={20} className="level-up-overlay__crown" aria-hidden />
            <motion.span
              className="level-up-overlay__level"
              key={level}
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.25, 1] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {level}
            </motion.span>
            <span className="level-up-overlay__shine" aria-hidden />
          </motion.div>

          {SPARKS.map((spark) => (
            <motion.span
              key={spark.id}
              className="level-up-overlay__spark"
              style={{ rotate: `${spark.angle}deg` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.2],
                y: [0, -spark.distance],
              }}
              transition={{ duration: 0.9, delay: spark.delay, ease: 'easeOut' }}
              aria-hidden
            />
          ))}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
