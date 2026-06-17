import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  effectId: string;
  message?: string;
  onComplete?: () => void;
  fullscreen?: boolean;
}

const CONFETE = ['#059669', '#34d399', '#fbbf24', '#38bdf8', '#a78bfa', '#f472b6'];
const FOGO = ['#f97316', '#fb923c', '#ef4444', '#fbbf24'];
const RAIOS = ['#fde047', '#facc15', '#fef08a'];
const PADRAO = ['#059669', '#34d399', '#fbbf24', '#38bdf8'];

const PARTICLE_COUNT = 24;

export function DailyShopPurchaseCelebration({ effectId, message, onComplete, fullscreen = false }: Props) {
  useEffect(() => {
    if (!onComplete) return;
    const timer = window.setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const palette =
    effectId === 'efeito_fogo'
      ? FOGO
      : effectId === 'efeito_raios'
        ? RAIOS
        : effectId === 'efeito_confete'
          ? CONFETE
          : PADRAO;

  const isBolt = effectId === 'efeito_raios';
  const isEmber = effectId === 'efeito_fogo';

  return (
    <div
      className={`game-daily-celebration${fullscreen ? ' game-daily-celebration--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={fullscreen ? true : undefined}
    >
      <motion.div
        className="game-daily-celebration__flash"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.85, 0] }}
        transition={{ duration: 0.55 }}
        aria-hidden
      />

      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <motion.span
          key={i}
          className={`game-daily-celebration__particle${isBolt ? ' game-daily-celebration__particle--bolt' : ''}${isEmber ? ' game-daily-celebration__particle--ember' : ''}`}
          style={{
            backgroundColor: palette[i % palette.length],
            left: `${8 + (i * 17) % 84}%`,
            top: `${38 + (i % 5) * 6}%`,
          }}
          initial={{ opacity: 1, scale: isBolt ? 0.2 : 1, y: 0, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: isBolt ? [0.2, 1.2, 0.4] : [1, 1.2, 0.3],
            y: [0, -90 - (i % 6) * 22],
            x: [(i % 2 === 0 ? -1 : 1) * (16 + (i % 7) * 10)],
            rotate: isEmber ? 0 : 180 + i * 14,
          }}
          transition={{ duration: 1.35, delay: i * 0.03, ease: 'easeOut' }}
          aria-hidden
        />
      ))}

      {message && (
        <motion.p
          className="game-daily-celebration__message"
          initial={{ scale: 0.5, opacity: 0, y: 12 }}
          animate={{ scale: [0.5, 1.08, 1], opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
