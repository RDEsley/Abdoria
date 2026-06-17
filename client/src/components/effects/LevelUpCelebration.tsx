import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { playLevelUp } from '@/lib/sounds';

interface Props {
  previousLevel: number;
  level: number;
  compact?: boolean;
}

const SPARKS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: i * 30,
  delay: 0.2 + (i % 4) * 0.05,
  distance: 36 + (i % 3) * 10,
}));

export function LevelUpCelebration({ previousLevel, level, compact = false }: Props) {
  const label = useMemo(
    () => (level - previousLevel > 1 ? `Níveis ${previousLevel} → ${level}!` : `Subiu para o nível ${level}!`),
    [level, previousLevel],
  );

  useEffect(() => {
    const t = window.setTimeout(() => playLevelUp(), 220);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`level-up-celebration${compact ? ' level-up-celebration--compact' : ''}`}
      aria-live="polite"
    >
      <motion.div
        className="level-up-celebration__ring"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.35, 1], opacity: [0, 0.9, 0.35] }}
        transition={{ duration: 0.7, times: [0, 0.45, 1], ease: 'easeOut' }}
        aria-hidden
      />

      <motion.div
        className="level-up-celebration__badge"
        initial={{ scale: 0.2, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.12 }}
      >
        <Zap size={compact ? 16 : 22} className="level-up-celebration__icon" aria-hidden />
        <motion.span
          className="level-up-celebration__level"
          key={level}
          initial={{ scale: 0.5, y: 8 }}
          animate={{ scale: [0.5, 1.25, 1], y: 0 }}
          transition={{ duration: 0.55, times: [0, 0.55, 1], delay: 0.28 }}
        >
          {level}
        </motion.span>
      </motion.div>

      {SPARKS.map((spark) => (
        <motion.span
          key={spark.id}
          className="level-up-celebration__spark"
          style={{ rotate: `${spark.angle}deg` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0.2],
            y: [0, -spark.distance],
          }}
          transition={{ duration: 0.75, delay: spark.delay, ease: 'easeOut' }}
          aria-hidden
        />
      ))}

      <motion.p
        className="level-up-celebration__label"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35 }}
      >
        {label}
      </motion.p>
    </div>
  );
}
