import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Coins, Gift, Sparkles, Zap } from 'lucide-react';
import { CosmeticEffectLayer } from '@/components/shop/CosmeticEffectLayer';
import { GameButton } from '@/components/ui/GameButton';
import { EnergyDrinkIcon } from '@/lib/daily-shop-display';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { useAuth } from '@/context/AuthContext';
import { CURRENCY_NAME, resolveCosmeticos, type AfkPendingReward } from '@/types';

interface Props {
  claimed: AfkPendingReward;
  onClose: () => void;
}

export function AfkRewardCelebration({ claimed, onClose }: Props) {
  const { user } = useAuth();
  const effectId = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp).efeito_equipado;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const items: { key: string; label: string; icon: React.ReactNode; secret?: boolean }[] = [];
  if (claimed.xp > 0) items.push({ key: 'xp', label: `+${claimed.xp} XP`, icon: <Zap size={20} /> });
  if (claimed.abdoria > 0) {
    items.push({ key: 'abdoria', label: `+${claimed.abdoria} ${CURRENCY_NAME}`, icon: <Coins size={20} /> });
  }
  if (claimed.energy_drinks > 0) {
    items.push({
      key: 'drink',
      label: `+${claimed.energy_drinks} Energy Drink`,
      icon: <EnergyDrinkIcon size={20} />,
    });
  }
  (claimed.cosmetic_ids ?? []).forEach((id) => {
    items.push({
      key: id,
      label: COSMETIC_BY_ID[id]?.nome ?? id,
      icon: <Gift size={20} />,
    });
  });
  if (claimed.titulo_secreto) {
    items.push({
      key: 'titulo_secreto',
      label: COSMETIC_BY_ID.titulo_secreto?.nome ?? 'Título secreto',
      icon: <Sparkles size={20} />,
      secret: true,
    });
  }

  return createPortal(
    <div
      className="game-daily-reward-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="afk-reward-title"
      onClick={onClose}
    >
      <CosmeticEffectLayer effectId={effectId} mode="burst" />

      <motion.div
        className="game-daily-reward-card game-daily-reward-card--raro"
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="game-daily-reward-card__eyebrow">Patrulha AFK</p>
        <h2 id="afk-reward-title" className="game-daily-reward-card__title">
          Recompensas coletadas!
        </h2>
        <p className="game-daily-reward-card__message">Seu herói voltou da patrulha com loot.</p>

        <div className="game-afk-rewards__grid mt-4">
          {items.map((item) => (
            <div
              key={item.key}
              className={`game-afk-reward${item.secret ? ' game-afk-reward--secret' : ''}`}
            >
              <span className="game-afk-reward__icon">{item.icon}</span>
              <span className={`game-afk-reward__label${item.secret ? ' cosmetic-title--secreto' : ''}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <GameButton className="w-full mt-5" size="lg" onClick={onClose}>
          Continuar
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}
