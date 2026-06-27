import { useEffect, useState } from 'react';
import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';

interface Props {
  effectId: string;
  active?: boolean;
}

const BURST_INTERVAL_MS: Record<string, number> = {
  efeito_padrao: 2400,
  efeito_confete: 2600,
  efeito_fogo: 2200,
  efeito_raios: 2000,
  efeito_agua: 2400,
  efeito_glitch: 2200,
};

/** Prévia da loja — repete o mesmo burst usado nas celebrações do jogo. */
export function EffectPreview({ effectId, active = true }: Props) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setCycle((value) => value + 1);
  }, [effectId]);

  useEffect(() => {
    if (!active) return;
    const interval = BURST_INTERVAL_MS[effectId] ?? 2400;
    const timer = window.setInterval(() => setCycle((value) => value + 1), interval);
    return () => window.clearInterval(timer);
  }, [effectId, active]);

  return (
    <CosmeticEffectLayer
      key={`${effectId}-${cycle}`}
      effectId={effectId}
      active={active}
      mode="burst"
      preview
      className="game-completion-effect game-completion-effect--shop-live"
    />
  );
}
