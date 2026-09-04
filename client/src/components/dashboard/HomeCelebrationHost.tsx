import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  consumeHomeCelebration,
  HOME_CELEBRATION_QUEUED_EVENT,
  peekNextHomeCelebration,
  type HomeCelebration,
} from '@/lib/home-celebrations';
import { playStreak } from '@/lib/sounds';
import { successHaptic } from '@/lib/platform/native-runtime';

const HOLD_STREAK_MS = 2600;
const HOLD_FROZEN_MS = 3400;
const IGNITE_DELAY_MS = 420;

function startCelebration(
  next: HomeCelebration,
  setEvent: (value: HomeCelebration | null) => void,
  setDisplay: (value: number) => void,
  setLit: (value: boolean) => void,
  showingRef: { current: boolean },
) {
  showingRef.current = true;
  consumeHomeCelebration(next.id);
  setEvent(next);
  if (next.kind === 'streak_up') {
    setDisplay(next.streak_anterior);
    setLit(false);
    playStreak();
    void successHaptic();
  } else {
    setDisplay(next.preserved_streak);
    void successHaptic();
  }
}

/**
 * Celebração de "Dia Ativo" na Home. Duas variantes totalmente separadas —
 * streak subiu (fogo) e Frozen Streak consumido (gelo) — para não misturar
 * a linguagem visual de uma na outra (regra de produto: Frozen nunca deve
 * parecer parte da celebração normal de streak).
 */
export function HomeCelebrationHost() {
  const reduceMotion = Boolean(useReducedMotion());
  const [event, setEvent] = useState<HomeCelebration | null>(null);
  const [display, setDisplay] = useState(0);
  const [lit, setLit] = useState(false);
  const showingRef = useRef(false);

  useEffect(() => {
    const tryStart = () => {
      if (showingRef.current) return;
      const next = peekNextHomeCelebration();
      if (!next) return;
      startCelebration(next, setEvent, setDisplay, setLit, showingRef);
    };
    tryStart();
    window.addEventListener(HOME_CELEBRATION_QUEUED_EVENT, tryStart);
    return () => window.removeEventListener(HOME_CELEBRATION_QUEUED_EVENT, tryStart);
  }, []);

  useEffect(() => {
    if (!event) return;

    const timers: number[] = [];
    const advance = (holdMs: number) => {
      timers.push(
        window.setTimeout(() => {
          showingRef.current = false;
          setEvent(null);
          const leftover = peekNextHomeCelebration();
          if (leftover) startCelebration(leftover, setEvent, setDisplay, setLit, showingRef);
        }, holdMs),
      );
    };

    if (event.kind === 'streak_up') {
      timers.push(
        window.setTimeout(
          () => {
            setDisplay(event.streak_atual);
            setLit(true);
            void successHaptic();
          },
          reduceMotion ? 0 : IGNITE_DELAY_MS,
        ),
      );
      advance(HOLD_STREAK_MS);
    } else {
      advance(HOLD_FROZEN_MS);
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [event, reduceMotion]);

  const dismiss = () => {
    if (!event) return;
    showingRef.current = false;
    setEvent(null);
  };

  return (
    <AnimatePresence mode="wait">
      {event?.kind === 'streak_up' && (
        <StreakUpOverlay
          key={event.id}
          event={event}
          display={display}
          lit={lit}
          reduceMotion={reduceMotion}
          onDismiss={dismiss}
        />
      )}
      {event?.kind === 'frozen' && (
        <FrozenOverlay
          key={event.id}
          event={event}
          reduceMotion={reduceMotion}
          onDismiss={dismiss}
        />
      )}
    </AnimatePresence>
  );
}

interface StreakUpOverlayProps {
  event: Extract<HomeCelebration, { kind: 'streak_up' }>;
  display: number;
  lit: boolean;
  reduceMotion: boolean;
  onDismiss: () => void;
}

/** Uma fogueira só, número anterior → número novo em foco, glow morno e sutil. */
function StreakUpOverlay({ event, display, lit, reduceMotion, onDismiss }: StreakUpOverlayProps) {
  const firstDay = event.streak_anterior === 0;

  return (
    <motion.button
      type="button"
      className="streak-home-overlay"
      aria-live="polite"
      onClick={onDismiss}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
    >
      <motion.div
        className="streak-home-card"
        initial={reduceMotion ? false : { scale: 0.88, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { scale: 0.94, y: 8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.8 }}
      >
        <div className="streak-home-flame" aria-hidden>
          <span className="streak-home-flame__glow" />
          <span className={`streak-home-flame__body${lit ? ' streak-home-flame__body--lit' : ''}`}>
            <span className="streak-home-flame__outer" />
            <span className="streak-home-flame__core" />
          </span>
        </div>

        <p className="streak-home-card__kicker">
          {firstDay ? 'Sequência acesa' : 'Sequência em chamas'}
        </p>

        <p className="streak-home-card__count">
          <motion.span
            key={display}
            initial={reduceMotion ? false : { scale: 0.6, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            {display}
          </motion.span>
        </p>

        <p className="streak-home-card__copy">
          {firstDay
            ? 'Você plantou o primeiro dia.'
            : `${event.streak_anterior} → ${event.streak_atual} dias seguidos.`}
        </p>
        <span className="streak-home-card__hint">Toque para continuar</span>
      </motion.div>
    </motion.button>
  );
}

interface FrozenOverlayProps {
  event: Extract<HomeCelebration, { kind: 'frozen' }>;
  reduceMotion: boolean;
  onDismiss: () => void;
}

/** Frozen Streak — visual próprio (gelo), nunca reaproveita a fogueira do streak normal. */
function FrozenOverlay({ event, reduceMotion, onDismiss }: FrozenOverlayProps) {
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
