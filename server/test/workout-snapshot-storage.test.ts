import { describe, expect, it } from 'vitest';
import { SerializedOperationQueue } from '../../shared/persistence/serialized-operation-queue.js';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('fila persistente do snapshot de treino', () => {
  it('garante que clear vença um write nativo que já estava pendente', async () => {
    const queue = new SerializedOperationQueue();
    const pending = deferred();
    let stored: string | null = null;

    queue.enqueueLatestWrite(async () => {
      await pending.promise;
      stored = 'snapshot-antigo';
    });
    await Promise.resolve();
    queue.enqueueBarrier(async () => {
      stored = null;
    });
    pending.resolve();

    await queue.waitForIdle();
    expect(stored).toBeNull();
  });

  it('descarta writes que ainda não começaram quando a sessão é limpa', async () => {
    const queue = new SerializedOperationQueue();
    let writes = 0;
    let removals = 0;

    queue.enqueueLatestWrite(async () => {
      writes += 1;
    });
    queue.enqueueBarrier(async () => {
      removals += 1;
    });

    await queue.waitForIdle();
    expect(writes).toBe(0);
    expect(removals).toBe(1);
  });

  it('permite persistir uma nova sessão depois da limpeza', async () => {
    const queue = new SerializedOperationQueue();
    let stored: string | null = 'antigo';

    queue.enqueueBarrier(async () => {
      stored = null;
    });
    queue.enqueueLatestWrite(async () => {
      stored = 'novo';
    });

    await queue.waitForIdle();
    expect(stored).toBe('novo');
  });
});
