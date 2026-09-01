import { CosmeticAvatarBorderFx } from '@/components/cosmetics/CosmeticAvatarBorderFx';
import type { MolduraId } from '@/types';

interface Props {
  nome: string;
  avatarUrl?: string | null;
  moldura?: MolduraId | null;
  /**
   * Borda de conquista (moldura_loja) a desenhar no lugar da moldura de pódio —
   * usada quando a borda ativa do perfil é a de conquista (ver resolveIdentityBorder).
   */
  borderLoja?: string | null;
  /** Contador sobreposto à moldura; oculto quando null/0/1. */
  molduraCount?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Avatar de identidade (estilo Strava): círculo com a foto do usuário ou a
 * inicial do nome, com a borda de perfil equipada — de pódio (moldura) ou de
 * conquista (borderLoja). Avatares cosméticos completos usam `CosmeticAvatar`.
 */
export function UserAvatar({
  nome,
  avatarUrl,
  moldura = null,
  borderLoja = null,
  molduraCount = null,
  size = 'md',
  className = '',
}: Props) {
  const initial = (nome.trim().charAt(0) || 'A').toUpperCase();
  const lojaKey =
    borderLoja && borderLoja !== 'borda_basica' ? borderLoja.replace('borda_', '') : '';
  const showCount = !lojaKey && moldura != null && molduraCount != null && molduraCount > 1;

  return (
    <span
      className={[
        'user-avatar',
        `user-avatar--${size}`,
        !lojaKey && moldura ? `user-avatar--frame-${moldura}` : '',
        lojaKey ? `game-cosmetic-avatar--border-${lojaKey}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {lojaKey && <CosmeticAvatarBorderFx borderId={borderLoja!} />}
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="user-avatar__img" loading="lazy" />
      ) : (
        <span className="user-avatar__initial" aria-hidden>
          {initial}
        </span>
      )}
      {showCount && (
        <span className="user-avatar__count tabular-nums" aria-label={`${molduraCount} conquistas`}>
          {molduraCount > 99 ? '99+' : molduraCount}
        </span>
      )}
    </span>
  );
}
