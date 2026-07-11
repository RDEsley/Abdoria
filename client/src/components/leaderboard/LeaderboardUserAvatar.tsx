import { UserAvatar } from '@/components/profile/UserAvatar';
import type { LeaderboardEntry } from '@/types';

interface Props {
  entry: LeaderboardEntry;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Identidade no ranking (estilo Strava): foto/inicial + moldura conquistada. */
export function LeaderboardUserAvatar({ entry, size = 'sm', className = '' }: Props) {
  return (
    <UserAvatar
      nome={entry.nome}
      avatarUrl={entry.avatar_url}
      moldura={entry.moldura_equipada ?? null}
      molduraCount={entry.moldura_count ?? null}
      size={size}
      className={className}
    />
  );
}
