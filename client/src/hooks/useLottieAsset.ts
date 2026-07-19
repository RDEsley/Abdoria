import { useEffect, useState } from 'react';

// Cache em módulo: a mesma animação usada em múltiplos pontos do app não
// refaz o fetch do JSON (os arquivos de personagem/confete pesam ~100-330KB).
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

/** Carrega um JSON de animação Lottie de `public/` sob demanda, com cache. */
export function useLottieAsset(url: string): unknown | null {
  const [data, setData] = useState<unknown | null>(() => cache.get(url) ?? null);

  useEffect(() => {
    if (cache.has(url)) {
      setData(cache.get(url));
      return;
    }

    let cancelled = false;
    let request = inflight.get(url);
    if (!request) {
      request = fetch(url)
        .then((res) => res.json())
        .then((json) => {
          cache.set(url, json);
          return json;
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
  }, [url]);

  return data;
}
