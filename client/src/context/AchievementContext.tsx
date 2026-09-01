import { useCallback, useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import {
  notifyPersonalRecords,
  notifyWorkoutAchievements,
  registerAchievementTrigger,
  type AchievementToastItem,
  type TriggerAchievementPayload,
} from '@/lib/achievement-notifications';
import { playAchievementUnlock } from '@/lib/sounds';
import type { PersonalRecordNotice, UnlockedAchievementNotice } from '@/types';

const AchievementToast = lazy(() =>
  import('@/components/gamification/AchievementToast').then((module) => ({
    default: module.AchievementToast,
  })),
);

/** Uma conquista por vez, em fila (estilo notificação da Steam). */
const MAX_VISIBLE = 1;

function createToastItem(payload: TriggerAchievementPayload): AchievementToastItem {
  return {
    id: crypto.randomUUID(),
    title: payload.title,
    description: payload.description,
    type: payload.type ?? 'achievement',
    icon: payload.icon,
    customSoundUrl: payload.customSoundUrl,
  };
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AchievementToastItem[]>([]);
  const queueRef = useRef<AchievementToastItem[]>([]);

  const playedRef = useRef<Set<string>>(new Set());

  const enqueue = useCallback((payload: TriggerAchievementPayload) => {
    const item = createToastItem(payload);

    setItems((current) => {
      if (current.length < MAX_VISIBLE) {
        return [...current, item];
      }
      queueRef.current.push(item);
      return current;
    });
  }, []);

  // Reproduzir o som só quando o item fica visível evita sobreposição em desbloqueios em lote.
  useEffect(() => {
    for (const item of items) {
      if (!playedRef.current.has(item.id)) {
        playedRef.current.add(item.id);
        playAchievementUnlock(item.customSoundUrl);
      }
    }
  }, [items]);

  const handleDismiss = useCallback((id: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      while (next.length < MAX_VISIBLE && queueRef.current.length > 0) {
        next.push(queueRef.current.shift()!);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    registerAchievementTrigger(enqueue);
    return () => registerAchievementTrigger(null);
  }, [enqueue]);

  useEffect(() => {
    const onTrigger = (event: Event) => {
      const detail = (event as CustomEvent<TriggerAchievementPayload>).detail;
      if (detail) enqueue(detail);
    };
    window.addEventListener('abdoria:achievement-trigger', onTrigger);
    return () => window.removeEventListener('abdoria:achievement-trigger', onTrigger);
  }, [enqueue]);

  useEffect(() => {
    const onAchievements = (event: Event) => {
      const detail = (event as CustomEvent<UnlockedAchievementNotice[]>).detail;
      if (detail?.length) notifyWorkoutAchievements(detail);
    };
    window.addEventListener('abdoria:achievements-unlocked', onAchievements);
    return () => window.removeEventListener('abdoria:achievements-unlocked', onAchievements);
  }, []);

  useEffect(() => {
    const onPersonalRecords = (event: Event) => {
      const detail = (event as CustomEvent<PersonalRecordNotice[]>).detail;
      if (detail?.length) notifyPersonalRecords(detail);
    };
    window.addEventListener('abdoria:personal-records-unlocked', onPersonalRecords);
    return () => window.removeEventListener('abdoria:personal-records-unlocked', onPersonalRecords);
  }, []);

  return (
    <>
      {children}
      {createPortal(
        <div
          className="achievement-toast-stack"
          role="status"
          aria-live="polite"
          aria-label="Notificações de conquista"
        >
          <Suspense fallback={null}>
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <AchievementToast
                  key={item.id}
                  item={item}
                  stackIndex={index}
                  onDismiss={handleDismiss}
                />
              ))}
            </AnimatePresence>
          </Suspense>
        </div>,
        document.body,
      )}
    </>
  );
}
