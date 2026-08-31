import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

/** Folha dourada — apresentação visual da moeda premium `gems`. */
export function GemIcon({ size = 18 }: { size?: number }) {
  return <Leaf size={size} className="top-navbar__gem-icon" fill="currentColor" aria-hidden />;
}

export interface TopNavbarProps {
  userName: string;
  userLevel: number;
  userXp: number;
  xpMax: number;
  doriasAmount: number;
  /** Folhas douradas na UI; o contrato interno permanece `gemsAmount` por compatibilidade. */
  gemsAmount?: number;
  avatarUrl?: string | null;
  /** Sobrescreve avatarUrl quando presente (ex.: CosmeticAvatar). */
  avatar?: ReactNode;
  /** Nó pronto (ex.: <AnimatedTitleText>) — já traz sua própria classe/animação. */
  userTitle?: ReactNode;
  coinsEarnedPulse?: number | null;
  onProfileClick?: () => void;
  /** Ações extras à direita (ex.: sino de notificações). */
  actions?: ReactNode;
}

function formatAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
}

interface ResourcePillProps {
  icon: ReactNode;
  amount: number;
  label: string;
  pulse?: number | null;
}

function ResourcePill({ icon, amount, label, pulse }: ResourcePillProps) {
  return (
    <div className="top-navbar__pill" role="group" aria-label={`${formatAmount(amount)} ${label}`}>
      <div className="top-navbar__pill-icon" aria-hidden>
        {icon}
      </div>
      <span className="top-navbar__pill-value">{formatAmount(amount)}</span>
      <AnimatePresence>
        {pulse != null && pulse > 0 && (
          <motion.span
            className="top-navbar__pill-pulse"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -8 }}
            exit={{ opacity: 0, y: -16 }}
          >
            +{pulse}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopNavbar({
  userName,
  userLevel,
  userXp,
  xpMax,
  doriasAmount,
  gemsAmount = 0,
  avatarUrl,
  avatar,
  userTitle,
  coinsEarnedPulse,
  onProfileClick,
  actions,
}: TopNavbarProps) {
  const xpPct = xpMax > 0 ? Math.min(100, (userXp / xpMax) * 100) : 0;

  const avatarNode =
    avatar ??
    (avatarUrl ? (
      <img src={avatarUrl} alt="" className="top-navbar__avatar-img" />
    ) : (
      <span className="top-navbar__avatar-fallback">{userName.charAt(0).toUpperCase()}</span>
    ));

  return (
    <header className="top-navbar fixed top-0 right-0 left-0 z-50 md:left-64">
      <div className="top-navbar__inner flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <button
          type="button"
          className="top-navbar__profile flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3"
          onClick={onProfileClick}
          aria-label="Ver perfil"
        >
          <div className="top-navbar__avatar-wrap shrink-0">
            <div className="top-navbar__avatar">{avatarNode}</div>
            <span className="top-navbar__level-badge" aria-label={`Nível ${userLevel}`}>
              {userLevel}
            </span>
          </div>

          <div className="top-navbar__identity min-w-0 flex-1">
            {userTitle}
            <span className="top-navbar__name truncate">{userName}</span>
            <div
              className="top-navbar__xp-track"
              data-xp-bar-target
              role="progressbar"
              aria-valuenow={userXp}
              aria-valuemin={0}
              aria-valuemax={xpMax}
              aria-label={`XP ${userXp} de ${xpMax}`}
            >
              <div className="top-navbar__xp-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </button>

        <div className="top-navbar__resources flex shrink-0 items-center gap-2.5 sm:gap-3">
          <ResourcePill
            icon={<Leaf size={20} strokeWidth={2.5} className="top-navbar__coin-icon" />}
            amount={doriasAmount}
            label="Folhas"
            pulse={coinsEarnedPulse}
          />
          <ResourcePill icon={<GemIcon size={18} />} amount={gemsAmount} label="Folhas douradas" />
          {actions}
        </div>
      </div>
    </header>
  );
}
