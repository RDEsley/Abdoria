/**
 * Coordenador mínimo de celebração full-screen (puro, testável).
 * Prioridade: streak/frozen → level_up → cosmetic.
 */

export type FullscreenCelebrationId = 'streak' | 'frozen' | 'level_up' | 'cosmetic';

const PRIORITY: Record<FullscreenCelebrationId, number> = {
  streak: 10,
  frozen: 10,
  level_up: 20,
  cosmetic: 30,
};

export function createFullscreenCelebrationCoordinator() {
  let active: FullscreenCelebrationId | null = null;
  const waiters: Array<{ id: FullscreenCelebrationId; resolve: () => void }> = [];

  function pickNext(): { id: FullscreenCelebrationId; resolve: () => void } | undefined {
    if (waiters.length === 0) return undefined;
    let bestIdx = 0;
    for (let i = 1; i < waiters.length; i += 1) {
      if (PRIORITY[waiters[i].id] < PRIORITY[waiters[bestIdx].id]) bestIdx = i;
    }
    return waiters.splice(bestIdx, 1)[0];
  }

  return {
    isActive: () => active !== null,
    getActive: () => active,
    acquire(id: FullscreenCelebrationId): Promise<void> {
      if (!active) {
        active = id;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        waiters.push({ id, resolve });
      });
    },
    release(id: FullscreenCelebrationId): FullscreenCelebrationId | null {
      if (active !== id) return active;
      active = null;
      const next = pickNext();
      if (next) {
        active = next.id;
        next.resolve();
      }
      return active;
    },
  };
}
