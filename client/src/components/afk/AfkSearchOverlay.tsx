import { useEffect, useState, type CSSProperties } from 'react';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';

const LUPA_LOTTIE_URL = '/assets/Lupa.json';
const SEARCH_TEXT = 'Explorando...';

interface Props {
  /** Duração total da busca (5-10s), pra alimentar o contador regressivo. */
  durationMs: number;
}

/** Contador regressivo em milissegundos — dá ao jogador uma noção real de quanto
    falta, em vez de só uma animação sem fim visível. Conta a partir do
    relógio de verdade (não dos timers do pai), então não desalinha mesmo
    que o componente monte um instante depois do início da busca. */
function useCountdownMs(durationMs: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, durationMs));

  useEffect(() => {
    if (durationMs <= 0) {
      setRemaining(0);
      return undefined;
    }
    const startedAt = Date.now();
    setRemaining(durationMs);
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemaining(Math.max(0, durationMs - elapsed));
    }, 33);
    return () => window.clearInterval(id);
  }, [durationMs]);

  return remaining;
}

/**
 * Intervalo entre abates: sem inimigo em cena, personagem parado (sem
 * atirar sem parar) enquanto a lupa "procura" o próximo, perto de onde o
 * inimigo costuma aparecer. A posição é fixa para a leitura da cena não
 * saltar enquanto o contador avança. Ver AfkCombatScene.
 */
export function AfkSearchOverlay({ durationMs }: Props) {
  const lupaData = useLottieAsset(LUPA_LOTTIE_URL);
  const remainingMs = useCountdownMs(durationMs);

  return (
    <div className="game-afk-search" role="status" aria-live="polite">
      <div className="game-afk-search__lupa">
        <span className="game-afk-search__lupa-glow" aria-hidden />
        {lupaData ? <LottieView data={lupaData} loop /> : null}
        <span className="game-afk-search__countdown tabular-nums" aria-hidden>
          {(remainingMs / 1000).toFixed(3)}s
        </span>
      </div>
      <p className="game-afk-search__text">
        {SEARCH_TEXT.split('').map((char, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties} aria-hidden>
            {char}
          </span>
        ))}
        <span className="sr-only">{SEARCH_TEXT}</span>
      </p>
    </div>
  );
}
