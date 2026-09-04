/**
 * Coordenador mínimo: no máximo uma celebração full-screen por vez.
 * Prioridade: streak/frozen → level_up → cosmetic.
 */

import {
  createFullscreenCelebrationCoordinator,
  type FullscreenCelebrationId,
} from '@shared/celebrations/fullscreen-slot';

type SlotId = FullscreenCelebrationId;

const coordinator = createFullscreenCelebrationCoordinator();

export function isFullscreenCelebrationActive(): boolean {
  return coordinator.isActive();
}

export function getActiveFullscreenCelebration(): SlotId | null {
  return coordinator.getActive();
}

/** Aguarda até conseguir o slot exclusivo. */
export function acquireFullscreenCelebration(id: SlotId): Promise<void> {
  return coordinator.acquire(id);
}

export function releaseFullscreenCelebration(id: SlotId): void {
  const stillActive = coordinator.release(id);
  if (!stillActive) {
    window.dispatchEvent(new Event('evolyn:fullscreen-celebration-idle'));
  }
}

/** Registra callback para quando não houver overlay full-screen. */
export function onFullscreenCelebrationIdle(cb: () => void): () => void {
  const handler = () => {
    if (!coordinator.isActive()) cb();
  };
  window.addEventListener('evolyn:fullscreen-celebration-idle', handler);
  return () => window.removeEventListener('evolyn:fullscreen-celebration-idle', handler);
}
