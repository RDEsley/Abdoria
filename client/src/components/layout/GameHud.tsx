import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedTitleText } from '@/components/ui/AnimatedTitleText';
import { resolveEquippedTitle } from '@/lib/cosmetic-title';
import { resolveIdentityBorder } from '@/lib/identity-border';
import { resolveCosmeticos, xpProgressFromTotal } from '@/types';
import {
  XP_EARNED_EVENT,
  XP_ORB_LANDED_EVENT,
  type XpEarnedDetail,
  type XpOrbLandedDetail,
} from '@/lib/xp-orbs';

export function GameHud() {
  const navigate = useNavigate();
  const { stats, user: appUser } = useApp();
  const { user: authUser } = useAuth();
  const user = appUser ?? authUser;
  const [coinsEarnedPulse, setCoinsEarnedPulse] = useState<number | null>(null);
  const coinsPulseTimer = useRef<number | undefined>(undefined);
  // Segura a barra de XP no valor de ANTES do ganho (offset negativo) até as
  // bolinhas (XpOrbLayer) irem "pousando" — cada pouso devolve um pedaço via
  // XP_ORB_LANDED_EVENT, subindo a barra na ordem de chegada em vez de pular
  // direto pro total novo.
  const [xpDisplayOffset, setXpDisplayOffset] = useState(0);

  useEffect(() => {
    const onCoinsEarned = (event: Event) => {
      const amount = (event as CustomEvent<{ amount: number }>).detail?.amount ?? 0;
      if (amount <= 0) return;
      if (coinsPulseTimer.current) window.clearTimeout(coinsPulseTimer.current);
      setCoinsEarnedPulse(amount);
      coinsPulseTimer.current = window.setTimeout(() => setCoinsEarnedPulse(null), 2200);
    };
    window.addEventListener('abdoria:coins-earned', onCoinsEarned);
    return () => {
      window.removeEventListener('abdoria:coins-earned', onCoinsEarned);
      if (coinsPulseTimer.current) window.clearTimeout(coinsPulseTimer.current);
    };
  }, []);

  useEffect(() => {
    const onXpEarned = (event: Event) => {
      const amount = (event as CustomEvent<XpEarnedDetail>).detail?.amount ?? 0;
      if (amount <= 0) return;
      setXpDisplayOffset((prev) => prev - amount);
    };
    const onOrbLanded = (event: Event) => {
      const amount = (event as CustomEvent<XpOrbLandedDetail>).detail?.amount ?? 0;
      if (amount <= 0) return;
      setXpDisplayOffset((prev) => Math.min(0, prev + amount));
    };
    window.addEventListener(XP_EARNED_EVENT, onXpEarned);
    window.addEventListener(XP_ORB_LANDED_EVENT, onOrbLanded);
    return () => {
      window.removeEventListener(XP_EARNED_EVENT, onXpEarned);
      window.removeEventListener(XP_ORB_LANDED_EVENT, onOrbLanded);
    };
  }, []);

  const xpTotal = (stats?.nivel_xp ?? user?.gamificacao.nivel_xp ?? 0) + xpDisplayOffset;
  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(xpTotal);
  const firstName = user?.is_guest
    ? (user?.nome ?? 'Visitante')
    : (user?.nome?.split(' ')[0] ?? 'Atleta');
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
      onProfileClick={() => {
        // Sem scroll-restoration global no app: sem isso, o Perfil montava
        // na MESMA posição de rolagem da página anterior, em vez de abrir
        // do topo (o esperado ao entrar numa página nova pelo avatar/nome).
        window.scrollTo(0, 0);
        navigate('/perfil');
      }}
      actions={<NotificationsBell />}
    />
  );
}
