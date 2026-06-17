import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';

interface Props {
  effectId: string;
  message?: string;
  onComplete?: () => void;
  fullscreen?: boolean;
}

export function DailyShopPurchaseCelebration({ effectId, message, onComplete, fullscreen = false }: Props) {
  useEffect(() => {
    if (!onComplete) return;
    const timer = window.setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

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
        animate={{ opacity: [0, 0.92, 0.35, 0] }}
        transition={{ duration: 0.75 }}
        aria-hidden
      />

      <CosmeticEffectLayer effectId={effectId} mode="burst" className="game-daily-celebration__effect" />

      {message && (
        <motion.p
          className="game-daily-celebration__message"
          initial={{ scale: 0.5, opacity: 0, y: 12 }}
          animate={{ scale: [0.5, 1.1, 1], opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
