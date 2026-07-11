import type { MolduraId } from '@/types';

interface Props {
  nome: string;
  avatarUrl?: string | null;
  moldura?: MolduraId | null;
  /** Contador sobreposto à moldura; oculto quando null/0/1. */
  molduraCount?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Avatar de identidade (estilo Strava): círculo com a foto do usuário ou a
 * inicial do nome, com moldura conquistada por pódio/itens secretos.
 * O herói cosmético RPG continua sendo o CosmeticAvatar.
 */
export function UserAvatar({
  nome,
  avatarUrl,
  moldura = null,
  molduraCount = null,
  size = 'md',
  className = '',
}: Props) {
  const initial = (nome.trim().charAt(0) || 'A').toUpperCase();
  const showCount = moldura != null && molduraCount != null && molduraCount > 1;

  return (
    <span
      className={[
        'user-avatar',
        `user-avatar--${size}`,
        moldura ? `user-avatar--frame-${moldura}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
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
