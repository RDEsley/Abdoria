import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';
import { useReducedMotion } from 'framer-motion';

interface Props {
  effectId?: string;
}

export function CompletionCelebration({ effectId = 'efeito_confete' }: Props) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <CosmeticEffectLayer effectId={effectId} mode="burst" className="game-completion-effect" />
    </div>
  );
}
