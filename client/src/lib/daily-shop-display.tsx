import { Coins, Package, Zap } from 'lucide-react';
import type { LojaDiariaSlot } from '@/types';
import {
  CURRENCY_NAME,
  PATROL_CACHE_HOURS,
  PATROL_CACHE_ITEM_ID,
  PATROL_CACHE_LABEL,
  ROUTE_DRINK_ITEM_ID,
  ROUTE_DRINK_LABEL,
} from '@/types';

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

export function RouteDrinkIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-route-drink-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <rect x="7" y="3" width="10" height="4" rx="1" className="game-route-drink-icon__cap" />
        <rect x="6" y="7" width="12" height="14" rx="2" className="game-route-drink-icon__body" />
        <path
          d="M12 9v2m0 0c-1.5 0-2.5 1-2.5 2.2 0 1.2 1 2 2.5 2s2.5-.8 2.5-2c0-1.2-1-2.2-2.5-2.2z"
          className="game-route-drink-icon__tree"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 15v2" className="game-route-drink-icon__tree" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function PatrolCacheIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={`game-patrol-cache-icon${className ? ` ${className}` : ''}`} aria-hidden>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <rect x="4" y="9" width="16" height="10" rx="1.5" className="game-patrol-cache-icon__body" />
        <path d="M4 12h16" className="game-patrol-cache-icon__lid" strokeWidth="2" />
        <rect x="9" y="6" width="6" height="4" rx="1" className="game-patrol-cache-icon__lock" />
        <circle cx="12" cy="14" r="1.5" className="game-patrol-cache-icon__gem" />
      </svg>
    </span>
  );
}

export function formatDailyReward(slot: LojaDiariaSlot): string {
  if (slot.recompensa_tipo === 'item') {
    if (slot.item_id === 'energy_drink') return `+${slot.valor} Energy Drink`;
    if (slot.item_id === ROUTE_DRINK_ITEM_ID) return `+${slot.valor} ${ROUTE_DRINK_LABEL}`;
    if (slot.item_id === PATROL_CACHE_ITEM_ID) return `+${slot.valor} ${PATROL_CACHE_LABEL}`;
    return `+${slot.valor} item`;
  }
  if (slot.recompensa_tipo === 'pacote') {
    return `+${slot.bonus_xp ?? 0} XP · +${slot.bonus_abdoria ?? 0} ${CURRENCY_NAME}`;
  }
  return slot.recompensa_tipo === 'xp' ? `+${slot.valor} XP` : `+${slot.valor} ${CURRENCY_NAME}`;
}

export function dailyRewardIcon(slot: LojaDiariaSlot, size = 16) {
  if (slot.recompensa_tipo === 'item') {
    if (slot.item_id === PATROL_CACHE_ITEM_ID) return <PatrolCacheIcon size={size} />;
    if (slot.item_id === ROUTE_DRINK_ITEM_ID) return <RouteDrinkIcon size={size} />;
    return <EnergyDrinkIcon size={size} />;
  }
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

export function formatPatrolCacheDescription(): string {
  return `Recompensas de ${PATROL_CACHE_HOURS}h de Exploração AFK ao usar.`;
}
