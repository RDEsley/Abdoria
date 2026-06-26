import { Coins, Gift, Sparkles, Zap } from 'lucide-react';
import { EnergyDrinkIcon } from '@/lib/daily-shop-display';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { CURRENCY_NAME, type AfkPendingReward } from '@/types';

interface Props {
  pending: AfkPendingReward | null | undefined;
}

export function AfkRewardGrid({ pending }: Props) {
  if (!pending) {
    return (
      <>
        <p className="game-afk-rewards__title">Baú da patrulha</p>
        <p className="game-afk-rewards__empty">Derrote inimigos para encher o baú!</p>
      </>
    );
  }

  const items: {
    key: string;
    label: string;
    icon: React.ReactNode;
    secret?: boolean;
    kind: string;
  }[] = [];

  if (pending.xp > 0) {
    items.push({ key: 'xp', label: `+${pending.xp} XP`, icon: <Zap size={18} />, kind: 'xp' });
  }
  if (pending.abdoria > 0) {
    items.push({
      key: 'abdoria',
      label: `+${pending.abdoria} ${CURRENCY_NAME}`,
      icon: <Coins size={18} />,
      kind: 'abdoria',
    });
  }
  if (pending.energy_drinks > 0) {
    items.push({
      key: 'drink',
      label: `+${pending.energy_drinks} Energy Drink`,
      icon: <EnergyDrinkIcon size={18} />,
      kind: 'drink',
    });
  }
  (pending.cosmetic_ids ?? []).forEach((id) => {
    items.push({
      key: id,
      label: COSMETIC_BY_ID[id]?.nome ?? id,
      icon: <Gift size={18} />,
      kind: 'cosmetic',
    });
  });
  if (pending.titulo_secreto) {
    items.push({
      key: 'titulo_secreto',
      label: COSMETIC_BY_ID.titulo_secreto?.nome ?? 'Título secreto',
      icon: <Sparkles size={18} />,
      secret: true,
      kind: 'secret',
    });
  }

  return (
    <>
      <p className="game-afk-rewards__title">
        <Gift size={14} aria-hidden />
        Baú da patrulha ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="game-afk-rewards__empty">Derrote inimigos para encher o baú!</p>
      ) : (
        <div className="game-afk-rewards__grid">
          {items.map((reward, index) => (
            <div
              key={reward.key}
              className={`game-afk-reward game-afk-reward--${reward.kind}${reward.secret ? ' game-afk-reward--secret' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="game-afk-reward__icon">{reward.icon}</span>
              <span className={`game-afk-reward__label${reward.secret ? ' cosmetic-title--secreto' : ''}`}>
                {reward.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function countAfkRewardItems(pending: AfkPendingReward | null | undefined): number {
  if (!pending) return 0;
  let n = 0;
  if (pending.xp > 0) n += 1;
  if (pending.abdoria > 0) n += 1;
  if (pending.energy_drinks > 0) n += 1;
  n += (pending.cosmetic_ids ?? []).length;
  if (pending.titulo_secreto) n += 1;
  return n;
}
