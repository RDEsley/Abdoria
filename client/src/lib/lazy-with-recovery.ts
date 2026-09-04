import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  clearChunkReloadGuard,
  markChunkReloadGuard,
  shouldReloadForChunkError,
} from '@shared/lazy/chunk-recovery';

type ModuleFactory<T extends ComponentType<unknown>> = () => Promise<{ default: T }>;

/**
 * React.lazy com recovery único para chunk/deploy mismatch.
 * Build ≠ Release: isto NÃO dispara banner de versão — só evita tela branca.
 */
export function lazyWithRecovery<T extends ComponentType<unknown>>(
  moduleId: string,
  factory: ModuleFactory<T>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearChunkReloadGuard(moduleId);
      return mod;
    } catch (error) {
      if (shouldReloadForChunkError(moduleId, error) && typeof window !== 'undefined') {
        markChunkReloadGuard(moduleId);
        window.location.reload();
        // Mantém a Promise pendente durante o reload.
        return new Promise(() => undefined);
      }
      throw error;
    }
  });
}
