import { useEffect, useState } from 'react';

// Cache em módulo: a mesma animação usada em múltiplos pontos do app não
// refaz o fetch do JSON (os arquivos de personagem/confete pesam ~100-330KB).
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

/** Carrega um JSON de animação Lottie de `public/` sob demanda, com cache. */
export function useLottieAsset(url: string, enabled = true): unknown | null {
  const [data, setData] = useState<unknown | null>(() => (enabled ? cache.get(url) ?? null : null));

  useEffect(() => {
    if (!enabled) return;
    if (cache.has(url)) {
      setData(cache.get(url));
      return;
    }

    let cancelled = false;
    let request = inflight.get(url);
    if (!request) {
      request = fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((json) => {
          cache.set(url, json);
          return json;
        })
        .catch((error: unknown) => {
          console.error(`useLottieAsset: falha ao carregar ${url}`, error);
          return null;
        })
        .finally(() => {
          inflight.delete(url);
        });
      inflight.set(url, request);
    }

    void request.then((json) => {
      if (!cancelled) setData(json);
    });

    return () => {
      cancelled = true;
    };
  }, [url, enabled]);

  return data;
}
