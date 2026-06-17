import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { playLevelUp } from '@/lib/sounds';

interface Props {
  level: number;
  onDone: () => void;
}

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
    <div className="level-up-overlay" role="dialog" aria-live="assertive" aria-label={`Subiu para o nível ${level}`}>
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
          className="level-up-overlay__ring"
          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <Zap size={36} className="level-up-overlay__icon" />
        <p className="level-up-overlay__label">LEVEL UP!</p>
        <motion.p
          className="level-up-overlay__level"
          key={level}
          initial={{ scale: 0.5 }}
          animate={{ scale: [0.5, 1.2, 1] }}
          transition={{ duration: 0.5 }}
        >
          {level}
        </motion.p>
      </motion.div>
    </div>,
    document.body,
  );
}
