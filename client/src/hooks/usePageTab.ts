import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Tab da página atual: persiste só enquanto a rota está montada.
 * Ao sair e voltar, usa `fallback` (salvo deep link `?tab=`).
 * Não grava localStorage — diferente de `useStickyTab`.
 */
export function usePageTab<T extends string>(
  validTabs: readonly T[],
  fallback: T,
  aliases?: Partial<Record<string, T>>,
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSet = useMemo(() => new Set<string>(validTabs), [validTabs]);

  const resolve = useCallback(
    (raw: string | null): T | null => {
      if (!raw) return null;
      if (validSet.has(raw)) return raw as T;
      const aliased = aliases?.[raw];
      return aliased && validSet.has(aliased) ? aliased : null;
    },
    [aliases, validSet],
  );

  const [tab, setTabState] = useState<T>(() => resolve(searchParams.get('tab')) ?? fallback);

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
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
    const fromUrl = resolve(searchParams.get('tab'));
    if (!fromUrl) return;
    setTabState((current) => (current === fromUrl ? current : fromUrl));
  }, [resolve, searchParams]);

  return [tab, setTab];
}
