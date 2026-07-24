import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { AnimatedTitleText } from '@/components/ui/AnimatedTitleText';
import { resolveEquippedTitle } from '@/lib/cosmetic-title';
import { resolveIdentityBorder } from '@/lib/identity-border';
import { resolveCosmeticos, xpProgressFromTotal } from '@/types';

export function GameHud() {
  const navigate = useNavigate();
  const { stats, user: appUser } = useApp();
  const { user: authUser } = useAuth();
  const user = appUser ?? authUser;
  const [coinsEarnedPulse, setCoinsEarnedPulse] = useState<number | null>(null);

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
  const firstName = user?.is_guest ? user?.nome ?? 'Visitante' : user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const identityBorder = resolveIdentityBorder(cosmeticos);
  const resolvedTitle = resolveEquippedTitle(cosmeticos.titulo_equipado);

  return (
    <TopNavbar
      userName={firstName}
      userLevel={level}
      userXp={xpInLevel}
      xpMax={xpToNext}
      doriasAmount={cosmeticos.moedas}
      gemsAmount={user?.gems ?? 0}
      avatar={
        <UserAvatar
          nome={firstName}
          avatarUrl={user?.avatar_url}
          moldura={identityBorder.moldura}
          borderLoja={identityBorder.borderLoja}
          size="sm"
          className="top-navbar__identity-avatar"
        />
      }
      userTitle={<AnimatedTitleText title={resolvedTitle} className="top-navbar__title truncate" />}
      coinsEarnedPulse={coinsEarnedPulse}
      onProfileClick={() => navigate('/perfil')}
      actions={<NotificationsBell />}
    />
  );
}
