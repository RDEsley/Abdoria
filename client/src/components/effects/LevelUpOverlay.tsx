import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import { playLevelUp } from '@/lib/sounds';
import { successHaptic } from '@/lib/platform/native-runtime';

interface Props {
  level: number;
  previousLevel?: number;
  onDone: () => void;
}

const BURST_LOTTIE_URL = '/assets/levelup.json';
const IMPACT_UNLOCK_MS = 800;
const AUTO_CLOSE_MS = 3000;
const AUTO_CLOSE_REDUCED_MS = 1600;

/**
 * Level up global — número protagonista, burst leve, fecha sozinho (~3s).
 * Toque só libera depois do impacto principal.
 */
export function LevelUpOverlay({ level, previousLevel, onDone }: Props) {
  const reduceMotion = Boolean(useReducedMotion());
  const burstData = useLottieAsset(BURST_LOTTIE_URL, !reduceMotion);
  const [showBurst, setShowBurst] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);
  const [display, setDisplay] = useState(previousLevel ?? Math.max(1, level - 1));
  const hapticDone = useRef(false);

  useEffect(() => {
    setShowBurst(false);
    setCanDismiss(false);
    setDisplay(previousLevel ?? Math.max(1, level - 1));
    hapticDone.current = false;

    if (reduceMotion) {
      setDisplay(level);
      playLevelUp();
      if (!hapticDone.current) {
        hapticDone.current = true;
        void successHaptic();
      }
      setCanDismiss(true);
      const safety = window.setTimeout(onDone, AUTO_CLOSE_REDUCED_MS);
      return () => window.clearTimeout(safety);
    }

    const impact = window.setTimeout(() => {
      setDisplay(level);
      setShowBurst(true);
      playLevelUp();
      if (!hapticDone.current) {
        hapticDone.current = true;
        void successHaptic();
      }
    }, 420);

    const unlock = window.setTimeout(() => setCanDismiss(true), IMPACT_UNLOCK_MS);
    const safety = window.setTimeout(onDone, AUTO_CLOSE_MS);

    return () => {
      window.clearTimeout(impact);
      window.clearTimeout(unlock);
      window.clearTimeout(safety);
    };
  }, [level, previousLevel, onDone, reduceMotion]);

  return createPortal(
    <motion.div
      className="level-up-overlay"
      role="dialog"
      aria-live="assertive"
      aria-label={`Subiu para o nível ${level}`}
      onClick={() => {
        if (canDismiss) onDone();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
    >
      <div className="level-up-overlay__backdrop" aria-hidden />
      <div className="level-up-overlay__glow" aria-hidden />

      <div className="level-up-overlay__stage">
        {showBurst && burstData ? (
          <div className="level-up-overlay__burst" aria-hidden>
            <LottieView data={burstData} loop={false} contain />
          </div>
        ) : null}

        <motion.p
          key={display}
          className="level-up-overlay__level"
          initial={reduceMotion ? false : { scale: 0.82, opacity: 0.55 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}
        >
          {display}
        </motion.p>

        <motion.p
          className="level-up-overlay__banner"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.45, duration: 0.28 }}
        >
          LEVEL UP
        </motion.p>

        <motion.p
          className="level-up-overlay__copy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduceMotion ? 0.05 : 0.7, duration: 0.3 }}
        >
          Sua evolução ganhou um novo nível.
        </motion.p>
      </div>
    </motion.div>,
    document.body,
  );
}
