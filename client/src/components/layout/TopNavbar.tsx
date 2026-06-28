import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, Coins, Plus } from 'lucide-react';
import { CURRENCY_NAME } from '@/types';

export interface TopNavbarProps {
  userName: string;
  userLevel: number;
  userXp: number;
  xpMax: number;
  doriasAmount: number;
  /** Total de itens no inventário (badge na mochila). */
  inventoryItemCount?: number;
  avatarUrl?: string | null;
  /** Sobrescreve avatarUrl quando presente (ex.: CosmeticAvatar). */
  avatar?: ReactNode;
  userTitle?: string | null;
  titleClassName?: string;
  coinsEarnedPulse?: number | null;
  /** Classe do fundo cosmético equipado (ex.: `game-card-fundo--vulcao`). */
  backgroundClass?: string;
  /** Fundo claro (ex.: praia) — usa overlay claro + texto escuro. */
  backgroundLight?: boolean;
  onProfileClick?: () => void;
  onDoriasAddClick?: () => void;
  onInventoryClick?: () => void;
}

function formatAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return value.toLocaleString('pt-BR');
}

interface ResourcePillProps {
  icon: ReactNode;
  amount: number;
  onAdd?: () => void;
  addAriaLabel: string;
  pulse?: number | null;
}

function ResourcePill({ icon, amount, onAdd, addAriaLabel, pulse }: ResourcePillProps) {
  return (
    <div className="top-navbar__pill">
      <div className="top-navbar__pill-icon" aria-hidden>
        {icon}
      </div>
      <span className="top-navbar__pill-value">{formatAmount(amount)}</span>
      {onAdd && (
        <button type="button" className="top-navbar__pill-add" onClick={onAdd} aria-label={addAriaLabel}>
          <Plus size={13} strokeWidth={3} />
        </button>
      )}
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
  inventoryItemCount = 0,
  avatarUrl,
  avatar,
  userTitle,
  titleClassName,
  coinsEarnedPulse,
  backgroundClass,
  backgroundLight,
  onProfileClick,
  onDoriasAddClick,
  onInventoryClick,
}: TopNavbarProps) {
  const xpPct = xpMax > 0 ? Math.min(100, (userXp / xpMax) * 100) : 0;
  const skinClass = backgroundClass
    ? `${backgroundLight ? 'top-navbar--skinned-light' : 'top-navbar--skinned'} ${backgroundClass}`
    : '';

  const avatarNode =
    avatar ??
    (avatarUrl ? (
      <img src={avatarUrl} alt="" className="top-navbar__avatar-img" />
    ) : (
      <span className="top-navbar__avatar-fallback">{userName.charAt(0).toUpperCase()}</span>
    ));

  return (
    <header
      className={`top-navbar fixed top-0 right-0 left-0 z-50 md:left-64${skinClass ? ` ${skinClass}` : ''}`}
    >
      <div className="top-navbar__inner flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <button
          type="button"
          className="top-navbar__profile flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3"
          onClick={onProfileClick}
          aria-label="Abrir loja e personalizar perfil"
        >
          <div className="top-navbar__avatar-wrap shrink-0">
            <div className="top-navbar__avatar">{avatarNode}</div>
            <span className="top-navbar__level-badge" aria-label={`Nível ${userLevel}`}>
              {userLevel}
            </span>
          </div>

          <div className="top-navbar__identity min-w-0 flex-1">
            <div className="top-navbar__name-row flex min-w-0 items-baseline gap-1.5">
              <span className="top-navbar__name truncate">{userName}</span>
              {userTitle && (
                <span className={`top-navbar__title truncate ${titleClassName ?? ''}`.trim()}>{userTitle}</span>
              )}
            </div>
            <div
              className="top-navbar__xp-track"
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

        <div className="top-navbar__resources flex shrink-0 items-center gap-2 sm:gap-2.5">
          <ResourcePill
            icon={<Coins size={20} strokeWidth={2.5} className="top-navbar__coin-icon" />}
            amount={doriasAmount}
            onAdd={onDoriasAddClick}
            addAriaLabel={`Comprar mais ${CURRENCY_NAME}`}
            pulse={coinsEarnedPulse}
          />
          {onInventoryClick && (
            <button
              type="button"
              className="top-navbar__bag-btn"
              onClick={onInventoryClick}
              aria-label="Abrir inventário"
              title="Inventário"
            >
              <Backpack size={24} strokeWidth={2.2} aria-hidden />
              {inventoryItemCount > 0 && (
                <span className="top-navbar__bag-badge tabular-nums" aria-hidden>
                  {inventoryItemCount > 99 ? '99+' : inventoryItemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
