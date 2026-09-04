import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearChunkReloadGuard,
  hasChunkReloadGuard,
  isChunkLoadError,
  markChunkReloadGuard,
  shouldReloadForChunkError,
} from '../../shared/lazy/chunk-recovery.js';

describe('chunk-recovery', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    clearChunkReloadGuard('TrainingPage');
    clearChunkReloadGuard('mod-a');
    vi.unstubAllGlobals();
  });

  it('reconhece erros típicos de dynamic import / chunk', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/x.js')),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(Object.assign(new Error('Loading chunk 7 failed.'), { name: 'ChunkLoadError' }))).toBe(
      true,
    );
    expect(isChunkLoadError(new Error('Loading CSS chunk failed'))).toBe(true);
    expect(isChunkLoadError(new Error('TypeError: Cannot read properties of null'))).toBe(false);
    expect(isChunkLoadError(new Error('Render blow up'))).toBe(false);
  });

  it('permite um único reload por módulo', () => {
    const err = new Error('Failed to fetch dynamically imported module');
    expect(shouldReloadForChunkError('TrainingPage', err)).toBe(true);
    markChunkReloadGuard('TrainingPage');
    expect(hasChunkReloadGuard('TrainingPage')).toBe(true);
    expect(shouldReloadForChunkError('TrainingPage', err)).toBe(false);
    clearChunkReloadGuard('TrainingPage');
    expect(shouldReloadForChunkError('TrainingPage', err)).toBe(true);
  });

  it('não reloada erro React arbitrário mesmo sem guard', () => {
    expect(shouldReloadForChunkError('mod-a', new Error('Maximum update depth exceeded'))).toBe(
      false,
    );
  });
});
