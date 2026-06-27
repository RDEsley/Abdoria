import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { AchievementToast } from '@/components/gamification/AchievementToast';
import type { AfkPingResponse } from '@/lib/api';
import {
  notifyBestiaryUnlocks,
  notifyWorkoutAchievements,
  registerAchievementTrigger,
  type AchievementToastItem,
  type TriggerAchievementPayload,
} from '@/lib/achievement-notifications';
import { playAchievementUnlock } from '@/lib/sounds';
import type { UnlockedAchievementNotice } from '@/types';

const MAX_VISIBLE = 3;

interface AchievementContextValue {
  triggerAchievement: (payload: TriggerAchievementPayload) => void;
}

const AchievementContext = createContext<AchievementContextValue | null>(null);

function createToastItem(payload: TriggerAchievementPayload): AchievementToastItem {
  return {
    id: crypto.randomUUID(),
    title: payload.title,
    description: payload.description,
    type: payload.type ?? 'achievement',
    icon: payload.icon,
    enemyId: payload.enemyId,
    customSoundUrl: payload.customSoundUrl,
  };
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AchievementToastItem[]>([]);
  const queueRef = useRef<AchievementToastItem[]>([]);

  const enqueue = useCallback((payload: TriggerAchievementPayload) => {
    playAchievementUnlock(payload.customSoundUrl);
    const item = createToastItem(payload);

    setItems((current) => {
      if (current.length < MAX_VISIBLE) {
        return [...current, item];
      }
      queueRef.current.push(item);
      return current;
    });
  }, []);

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
    const onAfkSync = (event: Event) => {
      const detail = (event as CustomEvent<AfkPingResponse>).detail;
      const novos = detail?.bestiario_novos ?? [];
      if (novos.length > 0) notifyBestiaryUnlocks(novos);
    };
    window.addEventListener('abdoria:afk-sync', onAfkSync);
    return () => window.removeEventListener('abdoria:afk-sync', onAfkSync);
  }, []);

  useEffect(() => {
    const onAchievements = (event: Event) => {
      const detail = (event as CustomEvent<UnlockedAchievementNotice[]>).detail;
      if (detail?.length) notifyWorkoutAchievements(detail);
    };
    window.addEventListener('abdoria:achievements-unlocked', onAchievements);
    return () => window.removeEventListener('abdoria:achievements-unlocked', onAchievements);
  }, []);

  const value = useMemo(() => ({ triggerAchievement: enqueue }), [enqueue]);

  return (
    <AchievementContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="achievement-toast-stack" aria-label="Notificações de conquista">
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
        </div>,
        document.body,
      )}
    </AchievementContext.Provider>
  );
}

export function useAchievement(): AchievementContextValue {
  const ctx = useContext(AchievementContext);
  if (!ctx) {
    throw new Error('useAchievement must be used within AchievementProvider');
  }
  return ctx;
}

export { triggerAchievement, notifyBestiaryUnlocks, notifyWorkoutAchievements } from '@/lib/achievement-notifications';
