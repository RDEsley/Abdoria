import { CosmeticAvatarBorderFx } from '@/components/cosmetics/CosmeticAvatarBorderFx';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { resolveCosmeticos } from '@/types';
import type { IUserDocument } from '@/types';

interface Props {
  user: IUserDocument | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  borderId?: string;
}

const SIZE_CLASS = {
  sm: 'game-cosmetic-avatar--sm',
  md: 'game-cosmetic-avatar--md',
  lg: 'game-cosmetic-avatar--lg',
} as const;

/** Retrato de identidade: foto enviada pelo usuário ou a inicial do nome, com a
    moldura de loja equipada. Não há mais skins de avatar — só foto ou inicial. */
export function CosmeticAvatar({ user, size = 'md', className = '', borderId }: Props) {
  const cosmeticos = resolveCosmeticos(user?.cosmeticos);
  const resolvedBorderId = borderId ?? cosmeticos.moldura_loja_equipada;
  const borderDef = COSMETIC_BY_ID[resolvedBorderId];
  const firstName = user?.nome?.split(' ')[0] ?? 'A';
  const borderClass = borderDef
    ? `game-cosmetic-avatar--border-${borderDef.id.replace('borda_', '')}`
    : '';

  return (
    <div className={`game-cosmetic-avatar ${SIZE_CLASS[size]} ${borderClass} ${className}`.trim()}>
      {borderDef && <CosmeticAvatarBorderFx borderId={borderDef.id} />}
      {user?.avatar_url ? (
        <span className="game-avatar-portrait">
          <img
            src={user.avatar_url}
            alt=""
            className="game-avatar-portrait__img"
            draggable={false}
          />
        </span>
      ) : (
        <span className="game-avatar-initial-letter" aria-hidden>
          {firstName.charAt(0).toUpperCase() || 'A'}
        </span>
      )}
    </div>
  );
}
