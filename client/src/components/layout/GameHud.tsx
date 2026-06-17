import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Coins, Flame, Zap } from 'lucide-react';
import { CosmeticsModal } from '@/components/cosmetics/CosmeticsModal';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { XpBar } from '@/components/ui/XpBar';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { CURRENCY_NAME, XP_DAILY_CAP_PER_LEVEL, XP_DAILY_MIN_EXERCISES, XP_DAILY_PER_EXERCISE, resolveCosmeticos, xpProgressFromTotal } from '@/types';

export function GameHud() {
  const { stats, user: appUser } = useApp();
  const { user: authUser } = useAuth();
  const user = appUser ?? authUser;
  const [showCosmetics, setShowCosmetics] = useState(false);
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
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const equippedTitle = cosmeticos.titulo_equipado ? COSMETIC_BY_ID[cosmeticos.titulo_equipado]?.nome : null;
  const titleClass =
    cosmeticos.titulo_equipado === 'titulo_dono_do_jogo'
      ? 'game-hud__title cosmetic-title--dono-do-jogo'
      : 'game-hud__title';
  const dailyXpLimit = stats?.xp_diario_limite;
  const dailyXpTitle = dailyXpLimit
    ? `XP diário de exercícios: ${dailyXpLimit}/dia (+${XP_DAILY_CAP_PER_LEVEL} por nível) · ${XP_DAILY_PER_EXERCISE} XP por exercício (mín. ${XP_DAILY_MIN_EXERCISES} no treino)`
    : `XP diário de exercícios · ${XP_DAILY_PER_EXERCISE} XP por exercício (mín. ${XP_DAILY_MIN_EXERCISES} no treino)`;

  return (
    <>
      <button
        type="button"
        className="game-hud game-hud--interactive"
        onClick={() => setShowCosmetics(true)}
        aria-label="Abrir loja e personalizar perfil"
      >
        <CosmeticAvatar user={user} size="md" className="game-hud__avatar-wrap" />
        <div className="game-hud__info">
          <div className="game-hud__row">
            <div className="min-w-0">
              <span className="game-hud__name">{firstName}</span>
              {equippedTitle && <span className={titleClass}>{equippedTitle}</span>}
            </div>
            <span className="game-hud__level">
              <Zap size={12} /> Nv.{level}
            </span>
          </div>
          <XpBar value={xpInLevel} max={xpToNext} showValues={false} variant="xp" />
          {stats && (
            <div className="game-hud__stats">
              <span className="game-hud__chip">
                <Flame size={12} className={stats.streak_atual > 0 ? 'game-streak__flame--on' : undefined} /> {stats.streak_atual}d
              </span>
              <span className="game-hud__chip game-hud__chip--gold" title={dailyXpTitle}>
                XP {stats.xp_hoje}/{stats.xp_diario_limite}
                {stats.xp_extra_hoje > 0 ? ` +${stats.xp_extra_hoje}` : ''}
              </span>
              <span className="game-hud__chip game-hud__chip--coins relative">
                <Coins size={12} /> {cosmeticos.moedas} {CURRENCY_NAME}
                <AnimatePresence>
                  {coinsEarnedPulse !== null && (
                    <motion.span
                      className="game-hud__coins-pulse"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: -10 }}
                      exit={{ opacity: 0, y: -18 }}
                    >
                      +{coinsEarnedPulse}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </div>
          )}
        </div>
        <ChevronRight size={18} className="game-hud__chevron" aria-hidden />
      </button>

      <CosmeticsModal open={showCosmetics} onClose={() => setShowCosmetics(false)} />
    </>
  );
}
