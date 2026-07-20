import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import { playLevelUp } from '@/lib/sounds';

interface Props {
  level: number;
  onDone: () => void;
}

const BURST_LOTTIE_URL = '/assets/levelup.json';

/** De onde cada dígito do nível "voa" até encaixar no lugar — espalhado pela tela toda. */
const CONVERGE_FROM = [
  { x: -260, y: -220, rotate: -130 },
  { x: 260, y: -220, rotate: 130 },
  { x: -320, y: 40, rotate: -220 },
  { x: 320, y: 40, rotate: 220 },
  { x: -200, y: 260, rotate: -90 },
  { x: 200, y: 260, rotate: 90 },
  { x: 0, y: -320, rotate: 170 },
  { x: 0, y: 320, rotate: -170 },
];

/** Estilhaços que convergem pro centro junto dos dígitos, vindos de todo o círculo. */
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const rad = ((i * 360) / 14) * (Math.PI / 180);
  return {
    id: i,
    fromX: Math.cos(rad) * 420,
    fromY: Math.sin(rad) * 420,
    delay: 0.15 + (i % 5) * 0.04,
  };
});

/**
 * Celebração cinemática de level up: dígitos e estilhaços convergem de todas
 * as direções até encaixar, seguidos do burst do levelup.json e do banner.
 * Fecha ao toque em qualquer ponto da tela (com um limite de segurança caso
 * o usuário não toque em nada).
 */
export function LevelUpOverlay({ level, onDone }: Props) {
  const burstData = useLottieAsset(BURST_LOTTIE_URL);
  const [showBurst, setShowBurst] = useState(false);
  const digits = useMemo(() => String(level).split(''), [level]);

  useEffect(() => {
    setShowBurst(false);
    const sound = window.setTimeout(() => playLevelUp(), 650);
    const burst = window.setTimeout(() => setShowBurst(true), 620);
    const safety = window.setTimeout(onDone, 7000);
    return () => {
      window.clearTimeout(sound);
      window.clearTimeout(burst);
      window.clearTimeout(safety);
    };
  }, [level, onDone]);

  return createPortal(
    <motion.div
      className="level-up-overlay"
      role="dialog"
      aria-live="assertive"
      aria-label={`Subiu para o nível ${level}. Toque na tela para continuar.`}
      onClick={onDone}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <motion.div
        className="level-up-overlay__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <div className="level-up-overlay__stage">
        {showBurst && burstData ? (
          <div className="level-up-overlay__burst" aria-hidden>
            <LottieView data={burstData} loop={false} />
          </div>
        ) : null}

        <div className="level-up-overlay__digits" aria-hidden>
          {digits.map((digit, i) => {
            const origin = CONVERGE_FROM[i % CONVERGE_FROM.length];
            return (
              <motion.span
                key={`${level}-${i}`}
                className="level-up-overlay__digit"
                initial={{ x: origin.x, y: origin.y, opacity: 0, scale: 0.3, rotate: origin.rotate }}
                animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 18,
                  mass: 0.9,
                  delay: 0.15 + i * 0.09,
                }}
              >
                {digit}
              </motion.span>
            );
          })}
        </div>

        {SHARDS.map((shard) => (
          <motion.span
            key={shard.id}
            className="level-up-overlay__shard"
            initial={{ x: shard.fromX, y: shard.fromY, opacity: 0, scale: 0 }}
            animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [0, 1, 0.2] }}
            transition={{ duration: 0.55, delay: shard.delay, ease: 'easeIn' }}
            aria-hidden
          />
        ))}

        <motion.p
          className="level-up-overlay__banner"
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.75 }}
        >
          LEVEL UP!
        </motion.p>

        <motion.p
          className="level-up-overlay__hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.4 }}
        >
          Toque na tela para continuar
        </motion.p>
      </div>
    </motion.div>,
    document.body,
  );
}
