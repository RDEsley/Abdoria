import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import {
  consumeHomeCelebration,
  HOME_CELEBRATION_QUEUED_EVENT,
  peekNextHomeCelebration,
  type HomeCelebration,
} from '@/lib/home-celebrations';
import { playStreak } from '@/lib/sounds';
import { successHaptic } from '@/lib/platform/native-runtime';
import {
  acquireFullscreenCelebration,
  releaseFullscreenCelebration,
} from '@/lib/fullscreen-celebration';
import { prewarmLottieAsset } from '@/hooks/useLottieAsset';

const FIRE_STREAK_URL = '/assets/fire-streak.json';

/** Timeline streak_up (~2.1s total). Sem dismiss por toque. */
const STREAK_SPIN_MS = 320;
const STREAK_IMPACT_MS = 520;
const STREAK_HOLD_AFTER_MS = 900;
const STREAK_TOTAL_MS = STREAK_IMPACT_MS + STREAK_HOLD_AFTER_MS + 200;
const HOLD_FROZEN_MS = 3400;

async function startCelebration(
  next: HomeCelebration,
  setEvent: (value: HomeCelebration | null) => void,
  showingRef: { current: boolean },
) {
  showingRef.current = true;
  const slot = next.kind === 'frozen' ? 'frozen' : 'streak';
  await acquireFullscreenCelebration(slot);
  if (next.kind === 'streak_up') void prewarmLottieAsset(FIRE_STREAK_URL);
  consumeHomeCelebration(next.id);
  setEvent(next);
}

/**
 * Celebração de Dia Ativo na Home.
 * streak_up: número + fire-streak (não dismissível).
 * frozen: overlay próprio (toque para fechar).
 */
export function HomeCelebrationHost() {
  const reduceMotion = Boolean(useReducedMotion());
  const [event, setEvent] = useState<HomeCelebration | null>(null);
  const showingRef = useRef(false);

  useEffect(() => {
    const tryStart = () => {
      if (showingRef.current) return;
      const next = peekNextHomeCelebration();
      if (!next) return;
      startCelebration(next, setEvent, showingRef);
    };
    tryStart();
    window.addEventListener(HOME_CELEBRATION_QUEUED_EVENT, tryStart);

    // Idle Home: prewarm fire-streak sem colocar no bundle inicial.
    const idleTimer = window.setTimeout(() => {
      void prewarmLottieAsset(FIRE_STREAK_URL);
    }, 2500);

    return () => {
      window.removeEventListener(HOME_CELEBRATION_QUEUED_EVENT, tryStart);
      window.clearTimeout(idleTimer);
    };
  }, []);

  useEffect(() => {
    if (!event) return;

    const timers: number[] = [];
    const finish = (holdMs: number) => {
      timers.push(
        window.setTimeout(() => {
          const slot = event.kind === 'frozen' ? 'frozen' : 'streak';
          releaseFullscreenCelebration(slot);
          showingRef.current = false;
          setEvent(null);
          const leftover = peekNextHomeCelebration();
          if (leftover) void startCelebration(leftover, setEvent, showingRef);
        }, holdMs),
      );
    };

    if (event.kind === 'streak_up') {
      finish(reduceMotion ? 900 : STREAK_TOTAL_MS);
    } else {
      finish(HOLD_FROZEN_MS);
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [event, reduceMotion]);

  const dismissFrozen = () => {
    if (!event || event.kind !== 'frozen') return;
    releaseFullscreenCelebration('frozen');
    showingRef.current = false;
    setEvent(null);
  };

  return (
    <AnimatePresence mode="wait">
      {event?.kind === 'streak_up' && (
        <StreakUpOverlay key={event.id} event={event} reduceMotion={reduceMotion} />
      )}
      {event?.kind === 'frozen' && (
        <FrozenOverlay
          key={event.id}
          event={event}
          reduceMotion={reduceMotion}
          onDismiss={dismissFrozen}
        />
      )}
    </AnimatePresence>
  );
}

interface StreakUpOverlayProps {
  event: Extract<HomeCelebration, { kind: 'streak_up' }>;
  reduceMotion: boolean;
}

function StreakUpOverlay({ event, reduceMotion }: StreakUpOverlayProps) {
  const fireData = useLottieAsset(FIRE_STREAK_URL, !reduceMotion);
  const [phase, setPhase] = useState<'from' | 'spin' | 'impact' | 'to'>('from');
  const hapticDone = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      setPhase('to');
      playStreak();
      if (!hapticDone.current) {
        hapticDone.current = true;
        void successHaptic();
      }
      return;
    }

    setPhase('from');
    const spin = window.setTimeout(() => setPhase('spin'), 80);
    const impact = window.setTimeout(() => {
      setPhase('impact');
      playStreak();
      if (!hapticDone.current) {
        hapticDone.current = true;
        void successHaptic();
      }
    }, STREAK_IMPACT_MS);
    const to = window.setTimeout(() => setPhase('to'), STREAK_IMPACT_MS + 40);

    return () => {
      window.clearTimeout(spin);
      window.clearTimeout(impact);
      window.clearTimeout(to);
    };
  }, [event.id, reduceMotion]);

  const showFire = !reduceMotion && (phase === 'impact' || phase === 'to') && fireData;
  const display =
    phase === 'to' || phase === 'impact' ? event.streak_atual : event.streak_anterior;

  return (
    <motion.div
      className="streak-cinema"
      role="status"
      aria-live="assertive"
      aria-label={`Sequência ${event.streak_atual}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
    >
      <div className="streak-cinema__veil" aria-hidden />
      {showFire ? (
        <div
          className={`streak-cinema__fire${phase === 'to' ? ' streak-cinema__fire--rise' : ''}`}
          aria-hidden
        >
          <LottieView data={fireData} loop={false} contain />
        </div>
      ) : null}
      <motion.p
        key={`${phase}-${display}`}
        className={`streak-cinema__number${phase === 'spin' ? ' streak-cinema__number--spin' : ''}${phase === 'impact' || phase === 'to' ? ' streak-cinema__number--burst' : ''}`}
        initial={
          reduceMotion
            ? false
            : phase === 'spin'
              ? { scale: 1.08, rotate: -8 }
              : phase === 'impact' || phase === 'to'
                ? { scale: 1.35, opacity: 0.85 }
                : { scale: 0.92, opacity: 0.9 }
        }
        animate={{ scale: phase === 'spin' ? 1.12 : 1, opacity: 1, rotate: 0 }}
        transition={
          reduceMotion
            ? { duration: 0.2 }
            : phase === 'spin'
              ? { duration: STREAK_SPIN_MS / 1000, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 420, damping: 18 }
        }
      >
        {display}
      </motion.p>
    </motion.div>
  );
}

interface FrozenOverlayProps {
  event: Extract<HomeCelebration, { kind: 'frozen' }>;
  reduceMotion: boolean;
  onDismiss: () => void;
}

function FrozenOverlay({ event, reduceMotion, onDismiss }: FrozenOverlayProps) {
  useEffect(() => {
    void successHaptic();
  }, [event.id]);

  return (
    <motion.button
      type="button"
      className="streak-home-overlay streak-home-overlay--frozen"
      aria-live="polite"
      onClick={onDismiss}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
    >
      <motion.div
        className="streak-home-card streak-home-card--frozen"
        initial={reduceMotion ? false : { scale: 0.88, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { scale: 0.94, y: 8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.8 }}
      >
        <div className="streak-home-ice" aria-hidden>
          <span className="streak-home-ice__glow" />
          <span className="streak-home-ice__crystal" />
        </div>

        <p className="streak-home-card__kicker streak-home-card__kicker--ice">Frozen Streak</p>
        <p className="streak-home-card__count streak-home-card__count--ice">
          {event.preserved_streak}
        </p>
        <p className="streak-home-card__copy">
          {event.frozen_days.length > 1
            ? `${event.frozen_days.length} dias protegidos · sequência ${event.preserved_streak} mantida.`
            : `Sequência protegida · continua em ${event.preserved_streak}.`}
        </p>
        <span className="streak-home-card__hint">Toque para continuar</span>
      </motion.div>
    </motion.button>
  );
}
