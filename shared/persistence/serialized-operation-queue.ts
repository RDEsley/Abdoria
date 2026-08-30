/**
 * Serializa operações assíncronas de storage e invalida writes obsoletos.
 * Barriers (como `clear`) nunca são puladas; writes anteriores a uma barrier
 * não podem recriar dados depois que a limpeza foi solicitada.
 */
export class SerializedOperationQueue {
  private revision = 0;
  private tail: Promise<void> = Promise.resolve();

  enqueueLatestWrite(operation: () => Promise<void>): void {
    const revision = ++this.revision;
    this.tail = this.tail
      .catch(() => undefined)
      .then(async () => {
        if (revision !== this.revision) return;
        await operation();
      });
  }

  enqueueBarrier(operation: () => Promise<void>): void {
    this.revision += 1;
    this.tail = this.tail.catch(() => undefined).then(operation);
  }

  captureRevision(): number {
    return this.revision;
  }

  isCurrent(revision: number): boolean {
    return revision === this.revision;
  }

  async waitForIdle(): Promise<void> {
    await this.tail;
  }
}
