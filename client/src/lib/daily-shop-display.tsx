import { Coins, Package, Zap } from 'lucide-react';
import type { LojaDiariaSlot } from '@/types';
import { CURRENCY_NAME } from '@/types';

export function EnergyDrinkIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-energy-drink-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <rect x="7" y="3" width="10" height="4" rx="1" className="game-energy-drink-icon__cap" />
        <rect x="6" y="7" width="12" height="14" rx="2" className="game-energy-drink-icon__body" />
        <path d="M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function formatDailyReward(slot: LojaDiariaSlot): string {
  if (slot.recompensa_tipo === 'item') {
    return slot.item_id === 'energy_drink' ? `+${slot.valor} Energy Drink` : `+${slot.valor} item`;
  }
  if (slot.recompensa_tipo === 'pacote') {
    return `+${slot.bonus_xp ?? 0} XP · +${slot.bonus_abdoria ?? 0} ${CURRENCY_NAME}`;
  }
  return slot.recompensa_tipo === 'xp' ? `+${slot.valor} XP` : `+${slot.valor} ${CURRENCY_NAME}`;
}

export function dailyRewardIcon(slot: LojaDiariaSlot, size = 16) {
  if (slot.recompensa_tipo === 'item') return <EnergyDrinkIcon size={size} />;
  if (slot.recompensa_tipo === 'pacote') return <Package size={size} aria-hidden />;
  return slot.recompensa_tipo === 'xp' ? <Zap size={size} aria-hidden /> : <Coins size={size} aria-hidden />;
}

export function formatDailyPurchasePrice(slot: LojaDiariaSlot): string {
  const parts: string[] = [];
  if ((slot.preco_abdoria ?? 0) > 0) parts.push(`${slot.preco_abdoria} ${CURRENCY_NAME}`);
  if ((slot.preco_xp ?? 0) > 0) parts.push(`${slot.preco_xp} XP`);
  return parts.join(' + ') || 'Grátis';
}

export function dailyOfferTitle(slot: LojaDiariaSlot): string {
  if (slot.kind === 'recompensa_diaria') return 'Recompensa diária';
  return slot.oferta_nome ?? 'Oferta especial';
}

export function isLuckyFreeDailyReward(slot: LojaDiariaSlot): boolean {
  return slot.kind === 'recompensa_diaria' && (slot.raridade === 'raro' || slot.raridade === 'epico');
}
