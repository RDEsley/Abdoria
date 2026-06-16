import { useEffect } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#059669', '#34d399', '#fbbf24', '#f97316', '#38bdf8', '#a78bfa', '#f472b6'];

interface Props {
  label?: string;
  onComplete: () => void;
}

export function UnlockCelebration({ label = 'DESBLOQUEADO!', onComplete }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 1600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="unlock-celebration" role="presentation">
      <div className="unlock-celebration__burst" aria-hidden />
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.span
          key={i}
          className="unlock-celebration__particle"
          style={{
            backgroundColor: COLORS[i % COLORS.length],
            left: '50%',
            top: '50%',
          }}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0.5, 1.2, 0.3],
            x: Math.cos((i / 28) * Math.PI * 2) * (60 + (i % 5) * 18),
            y: Math.sin((i / 28) * Math.PI * 2) * (60 + (i % 4) * 22) - 20,
            rotate: (i % 2 === 0 ? 1 : -1) * (180 + i * 12),
          }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: i * 0.02 }}
        />
      ))}
      <motion.p
        className="unlock-celebration__label"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {label}
      </motion.p>
    </div>
  );
}
