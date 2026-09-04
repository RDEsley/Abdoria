import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GameToastHost } from '@/components/ui/GameToast';
import type { LevelUpCelebration as LevelUpData } from '@/types';
import {
  acquireFullscreenCelebration,
  releaseFullscreenCelebration,
} from '@/lib/fullscreen-celebration';
import { peekNextHomeCelebration } from '@/lib/home-celebrations';

const XpOrbLayer = lazy(() =>
  import('@/components/effects/XpOrbLayer').then((module) => ({ default: module.XpOrbLayer })),
);
const LevelUpOverlay = lazy(() =>
  import('@/components/effects/LevelUpOverlay').then((module) => ({
    default: module.LevelUpOverlay,
  })),
);
const CursorEffects = lazy(() =>
  import('@/components/effects/CursorEffects').then((module) => ({
    default: module.CursorEffects,
  })),
);
const CosmeticUnlockCelebration = lazy(() =>
  import('@/components/cosmetics/CosmeticUnlockCelebration').then((module) => ({
    default: module.CosmeticUnlockCelebration,
  })),
);

/**
 * Camadas globais de efeito — level up espera XP orbs (~1.25s) e depois
 * o slot full-screen (streak/frozen tem prioridade se já estiver na Home).
 */
export function GlobalEffectsHost() {
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null);

  useEffect(() => {
    const LEVEL_UP_DELAY_MS = 1250;
    let timer: number | null = null;
    let cancelled = false;

    const onLevelUp = (event: Event) => {
      const detail = (event as CustomEvent<LevelUpData>).detail;
      if (!detail?.level_novo) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void (async () => {
          // Se houver streak/frozen pendente na Home, deixa a Home consumir primeiro.
          if (peekNextHomeCelebration()) {
            await new Promise<void>((resolve) => {
              const tick = () => {
                if (!peekNextHomeCelebration()) {
                  window.removeEventListener('evolyn:home-celebration-queued', tick);
                  window.removeEventListener('evolyn:fullscreen-celebration-idle', tick);
                  resolve();
                  return;
                }
              };
              window.addEventListener('evolyn:fullscreen-celebration-idle', tick);
              // Timeout de segurança — não segurar level up para sempre.
              window.setTimeout(() => {
                window.removeEventListener('evolyn:fullscreen-celebration-idle', tick);
                resolve();
              }, 3500);
            });
          }
          if (cancelled) return;
          await acquireFullscreenCelebration('level_up');
          if (cancelled) {
            releaseFullscreenCelebration('level_up');
            return;
          }
          setLevelUp(detail);
        })();
      }, LEVEL_UP_DELAY_MS);
    };

    window.addEventListener('abdoria:level-up', onLevelUp);
    return () => {
      cancelled = true;
      window.removeEventListener('abdoria:level-up', onLevelUp);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <AnimatePresence>
          {levelUp !== null && (
            <LevelUpOverlay
              key={levelUp.level_novo}
              level={levelUp.level_novo}
              previousLevel={levelUp.level_anterior}
              onDone={() => {
                setLevelUp(null);
                releaseFullscreenCelebration('level_up');
              }}
            />
          )}
        </AnimatePresence>

        <CursorEffects />
        <XpOrbLayer />
        <CosmeticUnlockCelebration />
      </Suspense>
      <GameToastHost />
    </>
  );
}
