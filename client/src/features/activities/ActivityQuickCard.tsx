import { useEffect, useRef, useState } from 'react';
import { Archive, Check } from 'lucide-react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import { actionHaptic } from '@/lib/platform/native-runtime';
import {
  markActivitySwipeHintDone,
  shouldPlayActivitySwipeHint,
} from '@/lib/activity-swipe-hint';
import type { AchievementIcon } from '@/types';
import type { ActivityOccurrence } from '@shared/activities';

const COMPLETE_RATIO = 0.38;
const ARCHIVE_RATIO = 0.38;
const VELOCITY = 520;

export function ActivityQuickCard({
  occurrence,
  busy,
  playHint,
  onComplete,
  onArchive,
  onDetails,
  onHintConsumed,
}: {
  occurrence: ActivityOccurrence;
  busy?: boolean;
  /** Primeiro card elegível pode receber a micro-dica. */
  playHint?: boolean;
  onComplete: () => void;
  onArchive: () => void;
  onDetails: () => void;
  onHintConsumed?: () => void;
}) {
  const Icon =
    ACHIEVEMENT_ICON_COMPONENTS[occurrence.icon as AchievementIcon] ??
    ACHIEVEMENT_ICON_COMPONENTS.star;
  const done = occurrence.status === 'done';
  const reduceMotion = Boolean(useReducedMotion());
  const containerRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState<'complete' | 'archive' | null>(null);
  const hintPlayed = useRef(false);
  const userInterrupted = useRef(false);

  const x = useMotionValue(0);
  const completeOpacity = useTransform(x, [0, 56, 110], [0, 0.55, 1]);
  const completeScale = useTransform(x, [0, 56, 110], [0.72, 0.92, 1.08]);
  const archiveOpacity = useTransform(x, [0, -56, -110], [0, 0.55, 1]);
  const archiveScale = useTransform(x, [0, -56, -110], [0.72, 0.92, 1.08]);

  const canSwipe = !done && !busy && !exiting;

  useEffect(() => {
    if (!playHint || !canSwipe || reduceMotion || hintPlayed.current) return;
    if (!shouldPlayActivitySwipeHint()) return;
    hintPlayed.current = true;
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => window.setTimeout(r, 450));
      if (cancelled || userInterrupted.current) return;
      await animate(x, 52, { type: 'spring', stiffness: 280, damping: 22 });
      if (cancelled || userInterrupted.current) {
        void animate(x, 0, { type: 'spring', stiffness: 420, damping: 28 });
        return;
      }
      await animate(x, 0, { type: 'spring', stiffness: 320, damping: 24 });
      onHintConsumed?.();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [canSwipe, onHintConsumed, playHint, reduceMotion, x]);

  const commit = (action: 'complete' | 'archive') => {
    const width = containerRef.current?.offsetWidth ?? 320;
    setExiting(action);
    markActivitySwipeHintDone();
    void actionHaptic();
    // Dispara imediatamente — optimistic UI no parent; animação só acompanha.
    if (action === 'complete') onComplete();
    else onArchive();
    void animate(x, action === 'complete' ? width : -width, {
      type: 'spring',
      stiffness: 380,
      damping: 32,
    });
  };

  useEffect(() => {
    if (exiting !== 'complete') return;
    if (busy) return;
    if (occurrence.status === 'done') return;
    // Rollback: API falhou e o log otimista sumiu.
    setExiting(null);
    void animate(x, 0, { type: 'spring', stiffness: 420, damping: 30 });
  }, [busy, exiting, occurrence.status, x]);

  return (
    <article
      ref={containerRef}
      className={`activity-quick-card${done ? ' activity-quick-card--done' : ''}${exiting ? ` activity-quick-card--exit-${exiting}` : ''}`}
      data-no-nav-swipe
    >
      {canSwipe && (
        <>
          <motion.div
            aria-hidden
            className="activity-quick-card__reveal activity-quick-card__reveal--complete"
            style={{ opacity: completeOpacity }}
          >
            <motion.span style={{ scale: completeScale }} className="activity-quick-card__reveal-inner">
              <Check size={20} strokeWidth={3} />
              <span>Concluir</span>
            </motion.span>
          </motion.div>
          <motion.div
            aria-hidden
            className="activity-quick-card__reveal activity-quick-card__reveal--archive"
            style={{ opacity: archiveOpacity }}
          >
            <motion.span style={{ scale: archiveScale }} className="activity-quick-card__reveal-inner">
              <Archive size={18} strokeWidth={2.4} />
              <span>Remover</span>
            </motion.span>
          </motion.div>
        </>
      )}

      <motion.div
        className="activity-quick-card__surface"
        style={{ x }}
        drag={canSwipe ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: -140, right: 140 }}
        dragElastic={0.22}
        onPointerDown={() => {
          userInterrupted.current = true;
        }}
        onDragStart={() => {
          userInterrupted.current = true;
        }}
        onDragEnd={(_event, info) => {
          const width = containerRef.current?.offsetWidth ?? 320;
          const completeOk =
            info.offset.x > width * COMPLETE_RATIO ||
            (info.velocity.x > VELOCITY && info.offset.x > width * 0.18);
          const archiveOk =
            info.offset.x < -width * ARCHIVE_RATIO ||
            (info.velocity.x < -VELOCITY && info.offset.x < -width * 0.18);
          if (completeOk) {
            commit('complete');
            return;
          }
          if (archiveOk) {
            commit('archive');
            return;
          }
          void animate(x, 0, { type: 'spring', stiffness: 480, damping: 34 });
        }}
      >
        <button
          type="button"
          className="activity-quick-card__check"
          aria-label={done ? `${occurrence.name} concluída` : `Concluir ${occurrence.name}`}
          disabled={busy || done || Boolean(exiting)}
          onClick={() => {
            markActivitySwipeHintDone();
            void actionHaptic();
            onComplete();
          }}
        >
          {done ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
        </button>
        <button
          type="button"
          className="activity-quick-card__body"
          onClick={onDetails}
          aria-label={`Detalhes de ${occurrence.name}`}
        >
          <strong>{occurrence.name}</strong>
          <small>
            {occurrence.not_planned_today
              ? 'Fora de hoje'
              : (occurrence.time ?? 'Quando eu quiser')}
          </small>
        </button>
        {!done && (
          <button
            type="button"
            className="activity-quick-card__details"
            onClick={onDetails}
            aria-label={`Abrir detalhes de ${occurrence.name}`}
          >
            Detalhes
          </button>
        )}
      </motion.div>
    </article>
  );
}
