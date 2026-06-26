import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';
import { useMobileViewport } from '@/hooks/useMobileViewport';

type BackgroundVariant = 'app' | 'auth' | 'player';

interface AnimatedBackgroundProps {
  variant?: BackgroundVariant;
}

type OrbConfig = {
  className: string;
  animate: TargetAndTransition;
  transition: Transition;
};

const orbSets: Record<BackgroundVariant, OrbConfig[]> = {
  app: [
    {
      className: 'left-[-10%] top-[-6%] h-[50vh] w-[50vh] bg-teal-400/10',
      animate: { x: [0, 28, 0], y: [0, 18, 0], scale: [1, 1.04, 1] },
      transition: { duration: 28, repeat: Infinity, ease: 'easeInOut' },
    },
    {
      className: 'right-[-8%] bottom-[8%] h-[42vh] w-[42vh] bg-orange-300/10',
      animate: { x: [0, -22, 0], y: [0, -14, 0] },
      transition: { duration: 32, repeat: Infinity, ease: 'easeInOut' },
    },
  ],
  auth: [
    {
      className: 'left-[-15%] top-[-12%] h-[60vh] w-[60vh] bg-emerald-500/35',
      animate: { x: [0, 40, 0], y: [0, 28, 0] },
      transition: { duration: 22, repeat: Infinity, ease: 'easeInOut' },
    },
    {
      className: 'right-[-12%] bottom-[-10%] h-[52vh] w-[52vh] bg-sky-400/30',
      animate: { x: [0, -36, 0], y: [0, -24, 0] },
      transition: { duration: 26, repeat: Infinity, ease: 'easeInOut' },
    },
  ],
  player: [
    {
      className: 'left-[-15%] top-[-10%] h-[55vh] w-[55vh] bg-teal-400/12',
      animate: { x: [0, 16, 0], y: [0, 10, 0], scale: [1, 1.03, 1] },
      transition: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
    },
    {
      className: 'right-[-12%] bottom-[-8%] h-[48vh] w-[48vh] bg-stone-400/10',
      animate: { x: [0, -14, 0], y: [0, -16, 0] },
      transition: { duration: 22, repeat: Infinity, ease: 'easeInOut' },
    },
  ],
};

const baseGradients: Record<BackgroundVariant, string> = {
  app: 'bg-mesh-app',
  auth: 'bg-mesh-auth',
  player: 'bg-mesh-player',
};

export function AnimatedBackground({ variant = 'app' }: AnimatedBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const isMobile = useMobileViewport();
  const orbs = orbSets[variant];
  const showGrid = variant === 'app';
  const showOrbs = !isMobile && !reduceMotion;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className={`absolute inset-0 ${baseGradients[variant]}`} />

      {showGrid && <div className="bg-grid-pattern absolute inset-0 opacity-50" />}

      <div className="bg-radial-vignette absolute inset-0" />

      {showOrbs
        ? orbs.map((orb, index) => (
            <motion.div
              key={index}
              className={`absolute rounded-full blur-3xl ${orb.className}`}
              animate={orb.animate}
              transition={orb.transition}
            />
          ))
        : null}

      {variant === 'app' && !isMobile && (
        <div className="bg-noise absolute inset-0 opacity-[0.18] mix-blend-soft-light" />
      )}
    </div>
  );
}
