/**
 * Detecta falhas típicas de chunk/dynamic import após deploy (build A → build B).
 * Não cobre erros React arbitrários.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  const name = error instanceof Error ? error.name : '';
  const haystack = `${name} ${message}`.toLowerCase();
  return (
    haystack.includes('failed to fetch dynamically imported module') ||
    haystack.includes('importing a module script failed') ||
    haystack.includes('chunkloaderror') ||
    haystack.includes('loading chunk') ||
    haystack.includes('loading css chunk') ||
    /\/assets\/.+\.js/.test(haystack) && haystack.includes('404')
  );
}

const GUARD_PREFIX = 'evolyn:chunk-reload:';

export function chunkReloadGuardKey(moduleId: string): string {
  return `${GUARD_PREFIX}${moduleId}`;
}

export function hasChunkReloadGuard(moduleId: string): boolean {
  try {
    return sessionStorage.getItem(chunkReloadGuardKey(moduleId)) === '1';
  } catch {
    return true; // sem storage: não arriscar loop — trata como já tentado
  }
}

export function markChunkReloadGuard(moduleId: string): void {
  try {
    sessionStorage.setItem(chunkReloadGuardKey(moduleId), '1');
  } catch {
    /* ignore */
  }
}

export function clearChunkReloadGuard(moduleId: string): void {
  try {
    sessionStorage.removeItem(chunkReloadGuardKey(moduleId));
  } catch {
    /* ignore */
  }
}

/**
 * Decide se deve fazer UM reload controlado após falha de import.
 * Segunda falha no mesmo módulo → não reload (Error Boundary).
 */
export function shouldReloadForChunkError(moduleId: string, error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  if (hasChunkReloadGuard(moduleId)) return false;
  return true;
}
