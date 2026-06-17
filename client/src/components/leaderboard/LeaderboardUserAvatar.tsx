import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import type { IUserDocument, LeaderboardEntry } from '@/types';

interface Props {
  entry: LeaderboardEntry;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LeaderboardUserAvatar({ entry, size = 'sm', className = '' }: Props) {
  const displayUser = { nome: entry.nome } as IUserDocument;

  return (
    <CosmeticAvatar
      user={displayUser}
      avatarId={entry.avatar_equipado}
      borderId={entry.borda_equipada}
      size={size}
      className={className}
    />
  );
}
