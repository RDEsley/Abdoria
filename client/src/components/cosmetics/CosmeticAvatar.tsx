import { AvatarPortrait } from '@/components/cosmetics/AvatarPortrait';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { resolveCosmeticos } from '@/types';
import type { IUserDocument } from '@/types';

interface Props {
  user: IUserDocument | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  avatarId?: string;
  borderId?: string;
}

const SIZE_CLASS = {
  sm: 'game-cosmetic-avatar--sm',
  md: 'game-cosmetic-avatar--md',
  lg: 'game-cosmetic-avatar--lg',
} as const;

export function CosmeticAvatar({ user, size = 'md', className = '', avatarId, borderId }: Props) {
  const cosmeticos = resolveCosmeticos(user?.cosmeticos);
  const resolvedAvatarId = avatarId ?? cosmeticos.avatar_equipado;
  const resolvedBorderId = borderId ?? cosmeticos.borda_equipada;
  const avatarDef = COSMETIC_BY_ID[resolvedAvatarId];
  const borderDef = COSMETIC_BY_ID[resolvedBorderId];
  const firstName = user?.nome?.split(' ')[0] ?? 'A';
  const borderClass = borderDef ? `game-cosmetic-avatar--border-${borderDef.id.replace('borda_', '')}` : '';
  const initialClass = resolvedAvatarId === 'avatar_inicial' ? 'game-cosmetic-avatar--inicial' : '';

  return (
    <div
      className={`game-cosmetic-avatar ${SIZE_CLASS[size]} ${borderClass} ${initialClass} ${className}`.trim()}
      title={avatarDef?.nome}
    >
      <AvatarPortrait
        avatarId={resolvedAvatarId}
        letter={firstName}
        title={avatarDef?.nome}
      />
    </div>
  );
}
