import type { CSSProperties } from 'react';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';

const LUPA_LOTTIE_URL = '/assets/Lupa.json';
const SEARCH_TEXT = 'Explorando...';

interface Props {
  /** 0, 1 ou 2 — qual dos 3 pontos da tela a lupa está ocupando agora. */
  spot: number;
}

/**
 * Intervalo entre abates: sem inimigo em cena, personagem parado (sem
 * atirar sem parar) enquanto a lupa "procura" o próximo, trocando de lugar
 * algumas vezes até o novo inimigo aparecer. Ver AfkCombatScene.
 */
export function AfkSearchOverlay({ spot }: Props) {
  const lupaData = useLottieAsset(LUPA_LOTTIE_URL);

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
    </div>
  );
}
