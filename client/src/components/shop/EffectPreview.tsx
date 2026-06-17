import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';

interface Props {
  effectId: string;
  active?: boolean;
}

/** Preview contínuo de efeito cosmético (loja / perfil). */
export function EffectPreview({ effectId, active = true }: Props) {
  return <CosmeticEffectLayer effectId={effectId} active={active} mode="loop" />;
}
