import { Coins, Package, Zap } from 'lucide-react';
import type { LojaDiariaSlot } from '@/types';
import { CURRENCY_NAME } from '@/types';

export function formatDailyReward(slot: LojaDiariaSlot): string {
  if (slot.recompensa_tipo === 'pacote') {
    return `+${slot.bonus_xp ?? 0} XP · +${slot.bonus_abdoria ?? 0} ${CURRENCY_NAME}`;
  }
  return slot.recompensa_tipo === 'xp' ? `+${slot.valor} XP` : `+${slot.valor} ${CURRENCY_NAME}`;
}

export function dailyRewardIcon(slot: LojaDiariaSlot, size = 16) {
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
