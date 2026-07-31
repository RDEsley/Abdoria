import { useEffect, useState, type CSSProperties } from 'react';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';

const LUPA_LOTTIE_URL = '/assets/Lupa.json';
const SEARCH_TEXT = 'Explorando...';

interface Props {
  /** 0, 1 ou 2 — qual dos 3 pontos (perto de onde o inimigo aparece) a lupa está ocupando agora. */
  spot: number;
  /** Duração total da busca (5-10s), pra alimentar o contador regressivo. */
  durationMs: number;
}

/** Contador regressivo em segundos — dá ao jogador uma noção real de quanto
    falta, em vez de só uma animação sem fim visível. Conta a partir do
    relógio de verdade (não dos timers do pai), então não desalinha mesmo
    que o componente monte um instante depois do início da busca. */
function useCountdownSeconds(durationMs: number): number {
  const [remaining, setRemaining] = useState(() => Math.ceil(durationMs / 1000));

  useEffect(() => {
    if (durationMs <= 0) {
      setRemaining(0);
      return undefined;
    }
    const startedAt = Date.now();
    setRemaining(Math.ceil(durationMs / 1000));
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemaining(Math.max(0, Math.ceil((durationMs - elapsed) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [durationMs]);

  return remaining;
}

/**
 * Intervalo entre abates: sem inimigo em cena, personagem parado (sem
 * atirar sem parar) enquanto a lupa "procura" o próximo, perto de onde o
 * inimigo costuma aparecer (não espalhada pela cena inteira), trocando de
 * lugar algumas vezes até o novo inimigo aparecer. Ver AfkCombatScene.
 */
export function AfkSearchOverlay({ spot, durationMs }: Props) {
  const lupaData = useLottieAsset(LUPA_LOTTIE_URL);
  const remainingSec = useCountdownSeconds(durationMs);

  return (
    <div className="game-afk-search" role="status" aria-live="polite">
      <div className={`game-afk-search__lupa game-afk-search__lupa--spot-${spot}`}>
        <span className="game-afk-search__lupa-glow" aria-hidden />
        <span className="game-afk-search__lupa-ring" aria-hidden />
        {lupaData ? <LottieView data={lupaData} loop /> : null}
      </div>
      <p className="game-afk-search__text">
        {SEARCH_TEXT.split('').map((char, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties} aria-hidden>
            {char}
          </span>
        ))}
        <span className="sr-only">{SEARCH_TEXT}</span>
      </p>
      <span className="game-afk-search__countdown tabular-nums" aria-hidden>
        {remainingSec}s
      </span>
    </div>
  );
}
