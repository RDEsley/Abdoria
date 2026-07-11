import { useCallback, useEffect, useState } from 'react';
import { CosmeticsModal } from '@/components/cosmetics/CosmeticsModal';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { resolveCosmeticos, xpProgressFromTotal } from '@/types';

export function GameHud() {
  const { stats, user: appUser } = useApp();
  const { user: authUser } = useAuth();
  const user = appUser ?? authUser;
  const [showCosmetics, setShowCosmetics] = useState(false);
  const [coinsEarnedPulse, setCoinsEarnedPulse] = useState<number | null>(null);

  const closeCosmetics = useCallback(() => setShowCosmetics(false), []);

  useEffect(() => {
    const onCoinsEarned = (event: Event) => {
      const amount = (event as CustomEvent<{ amount: number }>).detail?.amount ?? 0;
      if (amount <= 0) return;
      setCoinsEarnedPulse(amount);
      window.setTimeout(() => setCoinsEarnedPulse(null), 2200);
    };
    window.addEventListener('abdoria:coins-earned', onCoinsEarned);
    return () => window.removeEventListener('abdoria:coins-earned', onCoinsEarned);
  }, []);

  const xpTotal = stats?.nivel_xp ?? user?.gamificacao.nivel_xp ?? 0;
  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(xpTotal);
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const equippedTitle = cosmeticos.titulo_equipado
    ? COSMETIC_BY_ID[cosmeticos.titulo_equipado]?.nome
    : null;
  const titleClassName =
    cosmeticos.titulo_equipado === 'titulo_dono_do_jogo'
      ? 'cosmetic-title--dono-do-jogo'
      : cosmeticos.titulo_equipado === 'titulo_secreto'
        ? 'cosmetic-title--secreto'
        : undefined;

  const fundoKey = cosmeticos.fundo_equipado.replace('fundo_', '');
  const backgroundClass = fundoKey === 'padrao' ? undefined : `game-card-fundo--${fundoKey}`;
  const backgroundLight = fundoKey === 'praia';

  return (
    <>
      <TopNavbar
        userName={firstName}
        userLevel={level}
        userXp={xpInLevel}
        xpMax={xpToNext}
        doriasAmount={cosmeticos.moedas}
        backgroundClass={backgroundClass}
        backgroundLight={backgroundLight}
        avatar={
          <UserAvatar
            nome={firstName}
            avatarUrl={user?.avatar_url}
            moldura={cosmeticos.moldura_equipada ?? null}
            size="sm"
            className="top-navbar__identity-avatar"
          />
        }
        userTitle={equippedTitle}
        titleClassName={titleClassName}
        coinsEarnedPulse={coinsEarnedPulse}
        onProfileClick={() => setShowCosmetics(true)}
        onDoriasAddClick={() => setShowCosmetics(true)}
        actions={<NotificationsBell />}
      />

      <CosmeticsModal open={showCosmetics} onClose={closeCosmetics} />
    </>
  );
}
