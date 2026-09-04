/**
 * Patch mínimo de áudio para PATCH /users/me.
 * Nunca incluir outras preferências — o backend mergePreferencias preserva o resto.
 */
export function buildAudioPreferenciasPatch(
  somHabilitado: boolean,
  sfxVolume: number,
): { som_habilitado: boolean; sfx_volume: number } {
  return {
    som_habilitado: somHabilitado,
    sfx_volume: sfxVolume,
  };
}

type AudioWrite = (som: boolean, volume: number) => Promise<void>;

/**
 * Persistência serial com coalesce: enquanto um write roda, novos valores
 * só atualizam o pending; ao terminar, grava de novo se houver pending.
 * Last-write-wins real no banco sem framework.
 */
export function createCoalescingAudioPersister(write: AudioWrite) {
  let inFlight = false;
  let pending: { som: boolean; volume: number } | null = null;
  let chain: Promise<void> = Promise.resolve();

  async function drain(): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    try {
      while (pending) {
        const next = pending;
        pending = null;
        await write(next.som, next.volume);
      }
    } finally {
      inFlight = false;
      if (pending) {
        await drain();
      }
    }
  }

  return {
    /** Agenda o valor mais recente; UI pode refletir na hora. */
    persist(som: boolean, volume: number): Promise<void> {
      pending = { som, volume };
      chain = chain.then(drain).catch(() => {
        /* mantém a cadeia viva */
      });
      return chain;
    },
  };
}
