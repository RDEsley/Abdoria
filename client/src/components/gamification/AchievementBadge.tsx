import type { CSSProperties } from 'react';
import type { AchievementIcon } from '@/types';
import {
  ACHIEVEMENT_ICON_COMPONENTS,
  ACHIEVEMENT_ICON_TONES,
} from '@/components/gamification/achievement-icons';

interface Props {
  icon: AchievementIcon;
  unlocked?: boolean;
  size?: number;
}

/** Selo redondo tipo medalha (o glifo muda por conquista, e a cor do
    medalhão também — cada ícone acende na cor que já evoca, chama em
    laranja, coração em rosa, lua em índigo etc.) — prata fosca e neutra
    enquanto bloqueada, a cor só "acende" ao desbloquear. O círculo escala
    com `size` (com uma margem fixa pro glifo não encostar na borda) em vez
    de um tamanho fixo por CSS, pra caber bem em qualquer contexto que use
    o selo (card de conquista, toast, perfil público). */
export function AchievementBadge({ icon, unlocked = false, size = 18 }: Props) {
  const Icon = ACHIEVEMENT_ICON_COMPONENTS[icon] ?? ACHIEVEMENT_ICON_COMPONENTS.medal;
  const tone = ACHIEVEMENT_ICON_TONES[icon] ?? ACHIEVEMENT_ICON_TONES.medal;
  const boxSize = size + 12;
  const style: CSSProperties & Record<'--medal-mid' | '--medal-dark', string> = {
    width: boxSize,
    height: boxSize,
    '--medal-mid': tone.mid,
    '--medal-dark': tone.dark,
  };

  return (
    <span
      className={`game-achievement__icon ${unlocked ? 'game-achievement__icon--lit' : ''}`}
      style={style}
    >
      <Icon size={size} stroke={2.25} />
    </span>
  );
}
