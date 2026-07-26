import { UserAvatar } from '@/components/profile/UserAvatar';
import { resolveIdentityBorder } from '@/lib/identity-border';
import type { LeaderboardEntry } from '@/types';

interface Props {
  entry: LeaderboardEntry;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Identidade no ranking (estilo Strava): foto/inicial + a borda de perfil
    realmente ativa — de pódio OU de conquista, igual ao próprio perfil
    (ver resolveIdentityBorder; antes o ranking só olhava moldura_equipada e
    ignorava borda de conquista equipada). */
export function LeaderboardUserAvatar({ entry, size = 'sm', className = '' }: Props) {
  const identityBorder = resolveIdentityBorder({
    borda_perfil_fonte: entry.borda_perfil_fonte,
    moldura_equipada: entry.moldura_equipada,
    moldura_loja_equipada: entry.moldura_loja_equipada,
  });

  return (
    <UserAvatar
      nome={entry.nome}
      avatarUrl={entry.avatar_url}
      moldura={identityBorder.moldura}
      borderLoja={identityBorder.borderLoja}
      molduraCount={entry.moldura_count ?? null}
      size={size}
      className={className}
    />
  );
}
