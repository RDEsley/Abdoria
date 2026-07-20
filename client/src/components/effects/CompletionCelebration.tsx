import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';
import { useAuth } from '@/context/AuthContext';

interface Props {
  effectId?: string;
}

export function CompletionCelebration({ effectId = 'efeito_confete' }: Props) {
  const { user } = useAuth();
  if (effectId === 'efeito_confete' && !(user?.preferencias?.confetti_animacoes_habilitadas ?? true)) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <CosmeticEffectLayer effectId={effectId} mode="burst" className="game-completion-effect" />
    </div>
  );
}
