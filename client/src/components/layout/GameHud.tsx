import { useState } from 'react';
import { ChevronRight, Coins, Flame, Zap } from 'lucide-react';
import { CosmeticsModal } from '@/components/cosmetics/CosmeticsModal';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { XpBar } from '@/components/ui/XpBar';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { CURRENCY_NAME, XP_DAILY_CAP_BASE, resolveCosmeticos, xpProgressFromTotal } from '@/types';

export function GameHud() {
  const { stats, user: appUser } = useApp();
  const { user: authUser } = useAuth();
  const user = appUser ?? authUser;
  const [showCosmetics, setShowCosmetics] = useState(false);

  const xpTotal = stats?.nivel_xp ?? user?.gamificacao.nivel_xp ?? 0;
  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(xpTotal);
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const equippedTitle = cosmeticos.titulo_equipado ? COSMETIC_BY_ID[cosmeticos.titulo_equipado]?.nome : null;
  const dailyXpTitle = `XP diário de exercícios: ${XP_DAILY_CAP_BASE}/dia · 20 XP por exercício (mín. 3 no treino)`;

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
              {equippedTitle && <span className="game-hud__title">{equippedTitle}</span>}
            </div>
            <span className="game-hud__level">
              <Zap size={12} /> Nv.{level}
            </span>
          </div>
          <XpBar value={xpInLevel} max={xpToNext} showValues={false} variant="xp" />
          {stats && (
            <div className="game-hud__stats">
              <span className="game-hud__chip">
                <Flame size={12} /> {stats.streak_atual}d
              </span>
              <span className="game-hud__chip game-hud__chip--gold" title={dailyXpTitle}>
                XP {stats.xp_hoje}/{stats.xp_diario_limite}
                {stats.xp_extra_hoje > 0 ? ` +${stats.xp_extra_hoje}` : ''}
              </span>
              <span className="game-hud__chip game-hud__chip--coins">
                <Coins size={12} /> {cosmeticos.moedas} {CURRENCY_NAME}
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
