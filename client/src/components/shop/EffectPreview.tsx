import { useEffect, useState } from 'react';
import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';

interface Props {
  effectId: string;
  active?: boolean;
}

/** Preview contínuo de efeito cosmético (loja / perfil). */
export function EffectPreview({ effectId, active = true }: Props) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setCycle((value) => value + 1);
  }, [effectId]);

  return (
    <CosmeticEffectLayer
      key={`${effectId}-${cycle}`}
      effectId={effectId}
      active={active}
      mode="loop"
      preview
    />
  );
}
