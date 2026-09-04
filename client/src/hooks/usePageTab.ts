import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Tab da página atual: estado local é a fonte de verdade enquanto a rota está montada.
 * URL só sincroniza writes (deep-link / share) e browser back — sem lutar contra cliques.
 * Ao sair e remontar a página, usa `fallback` (salvo `?tab=` no deep link).
 */
export function usePageTab<T extends string>(
  validTabs: readonly T[],
  fallback: T,
  aliases: Partial<Record<string, T>> = {},
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSet = useMemo(() => new Set<string>(validTabs), [validTabs]);
  // Preferir aliases estáveis no call site (const de módulo) para não recriar resolve.
  const aliasEntries = useMemo(() => Object.entries(aliases), [aliases]);

  const resolve = useCallback(
    (raw: string | null): T | null => {
      if (!raw) return null;
      if (validSet.has(raw)) return raw as T;
      for (const [from, to] of aliasEntries) {
        if (from === raw && to && validSet.has(to)) return to;
      }
      return null;
    },
    [aliasEntries, validSet],
  );

  const [tab, setTabState] = useState<T>(() => resolve(searchParams.get('tab')) ?? fallback);
  /** Ignora o próximo efeito de sync vindo do nosso próprio setSearchParams. */
  const skipNextUrlSyncRef = useRef(false);

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
      skipNextUrlSyncRef.current = true;
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === fallback) params.delete('tab');
          else params.set('tab', next);
          return params;
        },
        { replace: true },
      );
    },
    [fallback, setSearchParams],
  );

  useEffect(() => {
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false;
      return;
    }
    const fromUrl = resolve(searchParams.get('tab')) ?? fallback;
    setTabState((current) => (current === fromUrl ? current : fromUrl));
  }, [fallback, resolve, searchParams]);

  return [tab, setTab];
}
