import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type SproutPlay = 'full' | 'short' | 'still';

interface EvolynSproutMarkProps {
  play?: SproutPlay;
  className?: string;
}

const easeOut = [0.22, 1, 0.36, 1] as const;
const leafSpring = { type: 'spring' as const, stiffness: 260, damping: 20, mass: 0.75 };

/**
 * Símbolo Evolyn em vetor animável — base, caule e duas folhas com o
 * degradê teal → lima da marca oficial. Não substitui o PNG da BrandMark.
 */
export function EvolynSproutMark({ play = 'still', className = '' }: EvolynSproutMarkProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const gradientId = `evolyn-sprout-grad-${uid}`;
  const glowId = `evolyn-sprout-glow-${uid}`;
  const mode: SproutPlay = reduceMotion ? 'still' : play;
  const instant = mode === 'still';
  const short = mode === 'short';
  const delay = (full: number, shortened = 0) => (instant ? 0 : short ? shortened : full);

  return (
    <motion.svg
      className={`evolyn-sprout ${className}`.trim()}
      viewBox="0 0 80 80"
      aria-hidden
      initial={false}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="40"
          y1="68"
          x2="40"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#134e4a" />
          <stop offset="0.4" stopColor="#0f766e" />
          <stop offset="1" stopColor="#86efac" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="48%" r="50%">
          <stop offset="0" stopColor="rgb(52 211 153 / 38%)" />
          <stop offset="1" stopColor="rgb(52 211 153 / 0%)" />
        </radialGradient>
      </defs>

      <motion.circle
        cx="40"
        cy="38"
        r="26"
        fill={`url(#${glowId})`}
        initial={{ opacity: instant ? 0.5 : 0, scale: instant ? 1 : 0.7 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: instant ? 0.18 : 1, delay: delay(0.4, 0), ease: easeOut }}
      />

      <motion.ellipse
        cx="40"
        cy="62"
        rx="12"
        ry="3.2"
        fill="rgb(15 118 110 / 14%)"
        initial={{ opacity: instant ? 1 : 0, scaleX: instant ? 1 : 0.4 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: delay(0.5, 0.2), delay: delay(0.35, 0.05), ease: easeOut }}
      />

      <motion.circle
        cx="40"
        cy="57"
        r="3"
        fill="#134e4a"
        initial={{ opacity: instant ? 0 : 1, scale: instant ? 0 : 0.35 }}
        animate={{
          opacity: instant ? 0 : [1, 1, 0],
          scale: instant ? 0 : [0.35, 1, 0.45],
        }}
        transition={{ duration: delay(0.65, 0.12), times: [0, 0.5, 1], ease: easeOut }}
      />

      {/* Base — arco do solo */}
      <motion.path
        d="M21 56c0 9.2 38 9.2 38 0"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="7.4"
        strokeLinecap="round"
        initial={{ pathLength: instant ? 1 : 0, opacity: instant ? 1 : 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: delay(0.42, 0.18), delay: delay(0.1, 0), ease: easeOut }}
      />

      <motion.g
        style={{ transformOrigin: '40px 52px' }}
        initial={{ rotate: 0 }}
        animate={instant ? { rotate: 0 } : { rotate: short ? [0, 0.8, 0] : [0, 1.4, -0.5, 0] }}
        transition={{ delay: delay(1.35, 0.28), duration: delay(0.85, 0.45), ease: easeOut }}
      >
        {/* Caule — cresce de baixo para cima */}
        <motion.path
          d="M40 51.4V29.8"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="7.4"
          strokeLinecap="round"
          initial={{ pathLength: instant ? 1 : 0, opacity: instant ? 1 : 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: delay(0.52, 0.2), delay: delay(0.28, 0.04), ease: easeOut }}
        />

        {/* Folha esquerda (menor) */}
        <motion.path
          d="M37.6 30.6C28.4 32.2 22.6 25.4 24.8 17.8"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="7.2"
          strokeLinecap="round"
          style={{ transformOrigin: '38px 30px' }}
          initial={{
            pathLength: instant ? 1 : 0,
            opacity: instant ? 1 : 0,
            scale: instant ? 1 : 0.25,
            rotate: instant ? 0 : -22,
          }}
          animate={{ pathLength: 1, opacity: 1, scale: 1, rotate: 0 }}
          transition={
            instant
              ? { duration: 0.16 }
              : {
                  ...leafSpring,
                  delay: delay(0.72, 0.1),
                  pathLength: { duration: 0.38, delay: delay(0.72, 0.1), ease: easeOut },
                }
          }
        />

        {/* Folha direita (maior) */}
        <motion.path
          d="M42.4 29.2C53.6 20.4 59.2 8.6 51.2 6.4"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="7.2"
          strokeLinecap="round"
          style={{ transformOrigin: '42px 29px' }}
          initial={{
            pathLength: instant ? 1 : 0,
            opacity: instant ? 1 : 0,
            scale: instant ? 1 : 0.22,
            rotate: instant ? 0 : 18,
          }}
          animate={{ pathLength: 1, opacity: 1, scale: 1, rotate: 0 }}
          transition={
            instant
              ? { duration: 0.16 }
              : {
                  ...leafSpring,
                  delay: delay(1.05, 0.18),
                  pathLength: { duration: 0.42, delay: delay(1.05, 0.18), ease: easeOut },
                }
          }
        />
      </motion.g>
    </motion.svg>
  );
}
