import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Coins, Crown, Gift, Sparkles, Ticket, Zap } from 'lucide-react';
import { DailyShopPurchaseCelebration } from '@/components/shop/DailyShopPurchaseCelebration';
import { GameButton } from '@/components/ui/GameButton';
import type { GiftCodeRewardLine, RedeemCodeResponse } from '@/types';
import { CURRENCY_NAME } from '@/types';

interface Props {
  result: RedeemCodeResponse;
  effectId: string;
  onClose: () => void;
}

function formatRewardAmount(value: number): string {
  return value.toLocaleString('pt-BR');
}

function rewardIcon(line: GiftCodeRewardLine) {
  if (line.tipo === 'xp') return <Zap size={22} aria-hidden />;
  if (line.tipo === 'abdoria') return <Coins size={22} aria-hidden />;
  return <Crown size={22} aria-hidden />;
}

function rewardLabel(line: GiftCodeRewardLine): string {
  if (line.tipo === 'xp') return `+${formatRewardAmount(line.valor ?? 0)} XP`;
  if (line.tipo === 'abdoria') return `+${formatRewardAmount(line.valor ?? 0)} ${CURRENCY_NAME}`;
  return line.nome ?? 'Item exclusivo';
}

function rewardHint(line: GiftCodeRewardLine): string {
  if (line.tipo === 'xp') return 'Experiência extra na sua conta';
  if (line.tipo === 'abdoria') return 'Moedas para a loja';
  return 'Cosmético desbloqueado';
}

export function GiftCodeRewardReveal({ result, effectId, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rewards = result.recompensas?.length
    ? result.recompensas
    : buildFallbackRewards(result);

  return createPortal(
    <div
      className="game-daily-reward-overlay game-gift-reward-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-reward-title"
      onClick={onClose}
    >
      <DailyShopPurchaseCelebration effectId={effectId} fullscreen />

      <motion.div
        className="game-gift-reward-card"
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="game-gift-reward-card__banner">
          <Sparkles size={14} aria-hidden />
          <span>Código presente</span>
        </div>

        <p className="game-gift-reward-card__eyebrow">
          <Ticket size={13} aria-hidden /> {result.codigo}
        </p>
        <h2 id="gift-reward-title" className="game-gift-reward-card__title">
          Recompensas resgatadas!
        </h2>
        {result.mensagem && <p className="game-gift-reward-card__message">{result.mensagem}</p>}

        <ul className="game-gift-reward-list" aria-label="Recompensas recebidas">
          {rewards.map((line, index) => (
            <motion.li
              key={`${line.tipo}-${line.item_id ?? line.valor ?? index}`}
              className={`game-gift-reward-list__item game-gift-reward-list__item--${line.tipo}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.08 }}
            >
              <div className="game-gift-reward-list__icon">{rewardIcon(line)}</div>
              <div className="game-gift-reward-list__copy">
                <p className="game-gift-reward-list__value">{rewardLabel(line)}</p>
                <p className="game-gift-reward-list__hint">{rewardHint(line)}</p>
              </div>
              <Gift size={14} className="game-gift-reward-list__mark" aria-hidden />
            </motion.li>
          ))}
        </ul>

        <GameButton className="game-gift-reward-card__cta" onClick={onClose}>
          Incrível!
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}

function buildFallbackRewards(result: RedeemCodeResponse): GiftCodeRewardLine[] {
  const lines: GiftCodeRewardLine[] = [];
  if (result.xp_ganho > 0) lines.push({ tipo: 'xp', valor: result.xp_ganho });
  if (result.abdoria_ganha > 0) lines.push({ tipo: 'abdoria', valor: result.abdoria_ganha });
  if (result.titulo) lines.push({ tipo: 'cosmetico', nome: result.titulo });
  return lines;
}
