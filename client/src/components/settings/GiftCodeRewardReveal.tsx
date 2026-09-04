import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, Snowflake, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import type { GiftCodeRewardLine, RedeemCodeResponse } from '@/types';
import { CURRENCY_NAME } from '@/types';
import { GameLeafIcon, GoldenLeafIcon } from '@/components/ui/CurrencyIcon';

interface Props {
  result: RedeemCodeResponse;
  effectId?: string;
  onClose: () => void;
}

function formatRewardAmount(value: number): string {
  return value.toLocaleString('pt-BR');
}

function rewardIcon(line: GiftCodeRewardLine) {
  if (line.tipo === 'xp') return <Zap size={20} aria-hidden />;
  if (line.tipo === 'abdoria') return <GameLeafIcon size={22} aria-hidden />;
  if (line.tipo === 'frozen_streak') return <Snowflake size={20} aria-hidden />;
  if (line.tipo === 'gems') return <GoldenLeafIcon size={22} aria-hidden />;
  return <Crown size={20} aria-hidden />;
}

function rewardLabel(line: GiftCodeRewardLine): string {
  if (line.tipo === 'xp') return `+${formatRewardAmount(line.valor ?? 0)} XP`;
  if (line.tipo === 'abdoria') return `+${formatRewardAmount(line.valor ?? 0)} ${CURRENCY_NAME}`;
  if (line.tipo === 'frozen_streak') return `+${formatRewardAmount(line.valor ?? 0)} Frozen`;
  if (line.tipo === 'gems') return `+${formatRewardAmount(line.valor ?? 0)} Folhas douradas`;
  return line.nome ?? 'Item exclusivo';
}

function buildFallbackRewards(result: RedeemCodeResponse): GiftCodeRewardLine[] {
  const lines: GiftCodeRewardLine[] = [];
  if (result.xp_ganho > 0) lines.push({ tipo: 'xp', valor: result.xp_ganho });
  if (result.abdoria_ganha > 0) lines.push({ tipo: 'abdoria', valor: result.abdoria_ganha });
  for (const item of result.itens_desbloqueados ?? []) {
    lines.push({ tipo: 'cosmetico', nome: item, item_id: item });
  }
  return lines;
}

export function GiftCodeRewardReveal({ result, onClose }: Props) {
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rewards = result.recompensas?.length ? result.recompensas : buildFallbackRewards(result);

  return createPortal(
    <div
      className="gift-reveal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-reward-title"
      onClick={onClose}
    >
      <motion.div
        className="gift-reveal__card"
        initial={reduceMotion ? false : { scale: 0.94, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="gift-reveal__code">{result.codigo}</p>
        <h2 id="gift-reward-title" className="gift-reveal__title">
          {result.titulo ?? 'Recompensa recebida'}
        </h2>
        {result.mensagem ? <p className="gift-reveal__message">{result.mensagem}</p> : null}

        {rewards.length > 0 && (
          <ul className="gift-reveal__list" aria-label="Itens recebidos">
            {rewards.map((line, index) => (
              <li key={`${line.tipo}-${line.item_id ?? line.valor ?? index}`}>
                <span className="gift-reveal__icon">{rewardIcon(line)}</span>
                <strong>{rewardLabel(line)}</strong>
              </li>
            ))}
          </ul>
        )}

        <GameButton className="mt-4 w-full" onClick={onClose}>
          Continuar
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}
