import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Persists the active tab to `localStorage` and mirrors it in `?tab=`.
 * Restore order: URL (if present) > localStorage > fallback.
 */
export function useStickyTab<T extends string>(
  storageKey: string,
  validTabs: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSet = useMemo(() => new Set<string>(validTabs), [validTabs]);

  const [tab, setTabState] = useState<T>(() => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl && validSet.has(fromUrl)) return fromUrl as T;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && validSet.has(stored)) return stored as T;
    } catch {
      /* localStorage unavailable */
    }
    return fallback;
  });

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* best-effort */
      }
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
    [storageKey, fallback, setSearchParams],
  );

  useEffect(() => {
    const fromUrl = searchParams.get('tab');
    if (!fromUrl || !validSet.has(fromUrl)) return;
    setTabState((current) => (current === fromUrl ? current : (fromUrl as T)));
  }, [searchParams, validSet]);

  return [tab, setTab];
}
