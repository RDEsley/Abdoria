import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  consumeHomeCelebration,
  peekNextHomeCelebration,
  type HomeCelebration,
} from '@/lib/home-celebrations';
import { playStreak } from '@/lib/sounds';
import { successHaptic } from '@/lib/platform/native-runtime';

const HOLD_STREAK_MS = 3000;
const HOLD_FROZEN_MS = 3400;

function startCelebration(
  next: HomeCelebration,
  setEvent: (value: HomeCelebration | null) => void,
  setDisplay: (value: number) => void,
  setPhase: (value: 'cold' | 'lit' | 'frozen') => void,
) {
  consumeHomeCelebration(next.id);
  setEvent(next);
  if (next.kind === 'streak_up') {
    setDisplay(next.streak_anterior);
    setPhase('cold');
    playStreak();
    void successHaptic();
  } else {
    setDisplay(next.streak_atual);
    setPhase('lit');
    void successHaptic();
  }
}

export function HomeCelebrationHost() {
  const reduceMotion = useReducedMotion();
  const [event, setEvent] = useState<HomeCelebration | null>(null);
  const [display, setDisplay] = useState(0);
  const [phase, setPhase] = useState<'cold' | 'lit' | 'frozen'>('cold');

  useEffect(() => {
    const next = peekNextHomeCelebration();
    if (!next) return;
    startCelebration(next, setEvent, setDisplay, setPhase);
  }, []);

  useEffect(() => {
    if (!event) return;

    const timers: number[] = [];

    if (event.kind === 'streak_up') {
      timers.push(
        window.setTimeout(
          () => {
            setDisplay(event.streak_atual);
            setPhase('lit');
            void successHaptic();
          },
          reduceMotion ? 0 : 480,
        ),
      );
      timers.push(window.setTimeout(() => setEvent(null), HOLD_STREAK_MS));
    } else {
      timers.push(
        window.setTimeout(
          () => {
            setPhase('frozen');
            void successHaptic();
          },
          reduceMotion ? 0 : 700,
        ),
      );
      timers.push(
        window.setTimeout(() => {
          setEvent(null);
          const followUp = peekNextHomeCelebration();
          if (!followUp) return;
          window.setTimeout(() => {
            startCelebration(followUp, setEvent, setDisplay, setPhase);
          }, 220);
        }, HOLD_FROZEN_MS),
      );
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [event, reduceMotion]);

  const dismiss = () => {
    if (!event) return;
    const wasFrozen = event.kind === 'frozen';
    setEvent(null);
    if (!wasFrozen) return;
    const followUp = peekNextHomeCelebration();
    if (!followUp) return;
    window.setTimeout(() => {
      startCelebration(followUp, setEvent, setDisplay, setPhase);
    }, 160);
  };

  const firstDay = event?.kind === 'streak_up' && event.streak_anterior === 0;
  const ignited = phase === 'lit' || phase === 'frozen';
  const isFrozen = event?.kind === 'frozen' || phase === 'frozen';

  return (
    <AnimatePresence mode="wait">
      {event && (
        <motion.button
          key={event.id}
          type="button"
          className={`streak-home-overlay${isFrozen ? ' streak-home-overlay--frozen' : ''}`}
          aria-live="polite"
          onClick={dismiss}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`streak-home-card${isFrozen ? ' streak-home-card--frozen' : ''}`}
            initial={reduceMotion ? false : { scale: 0.72, rotate: -8, y: 24 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.9, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          >
            <div
              className={`streak-fire-celebration streak-fire-celebration--home${isFrozen ? ' streak-fire-celebration--protected' : ''}`}
              aria-hidden
            >
              {!reduceMotion && ignited && !isFrozen && (
                <span className="streak-fire-celebration__burst" />
              )}
              {!reduceMotion && isFrozen && (
                <>
                  <span className="streak-fire-celebration__ice-burst" />
                  <span className="streak-home-flake streak-home-flake--1" />
                  <span className="streak-home-flake streak-home-flake--2" />
                  <span className="streak-home-flake streak-home-flake--3" />
                </>
              )}
              <div className="streak-fire-celebration__flame-wrap">
                <div
                  className={`streak-fire-celebration__flame${
                    isFrozen
                      ? ' streak-fire-celebration__flame--iced'
                      : ignited
                        ? ' streak-fire-celebration__flame--lit'
                        : ' streak-fire-celebration__flame--cold'
                  }`}
                >
                  <span className="streak-fire-celebration__flame-outer" />
                  <span className="streak-fire-celebration__flame-mid" />
                  <span className="streak-fire-celebration__flame-core" />
                </div>
              </div>
            </div>

            {event.kind === 'streak_up' ? (
              <>
                <p className="streak-home-card__kicker">
                  {firstDay ? 'Sequência acesa' : 'Sequência em chamas'}
                </p>
                <p className="streak-home-card__count">
                  <motion.span
                    key={display}
                    initial={reduceMotion ? false : { scale: 0.55, y: 12 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 14 }}
                  >
                    {display}
                  </motion.span>
                </p>
                <p className="streak-home-card__copy">
                  {firstDay
                    ? 'Você plantou o primeiro dia. Volte amanhã para crescer.'
                    : `De ${event.streak_anterior} para ${event.streak_atual}. O dia está plantado.`}
                </p>
              </>
            ) : (
              <>
                <p className="streak-home-card__kicker streak-home-card__kicker--ice">
                  Frozen Streak
                </p>
                <p className="streak-home-card__count streak-home-card__count--ice">
                  <motion.span
                    key={`ice-${display}`}
                    initial={reduceMotion ? false : { scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                  >
                    {display}
                  </motion.span>
                </p>
                <p className="streak-home-card__copy">
                  {event.frozen_days.length > 1
                    ? `${event.frozen_days.length} dias protegidos. Sua sequência continua.`
                    : 'Seu Streak foi protegido. A sequência continua.'}
                </p>
              </>
            )}
            <span className="streak-home-card__hint">Toque para continuar</span>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
