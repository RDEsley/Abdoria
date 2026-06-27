import { createPortal } from 'react-dom';
import { GameButton } from '@/components/ui/GameButton';
import { RouteDrinkIcon } from '@/lib/daily-shop-display';
import { ROUTE_DRINK_HOURS, ROUTE_DRINK_LABEL } from '@/types';

interface Props {
  open: boolean;
  routeDrinkCount: number;
  using: boolean;
  canUse?: boolean;
  /** Sobrepõe inventário/modais aninhados. */
  layer?: 'default' | 'modal';
  onConfirm: () => void;
  onCancel: () => void;
}

export function RouteDrinkSuggestModal({
  open,
  routeDrinkCount,
  using,
  canUse = true,
  layer = 'default',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div
      className={`game-modal-overlay${layer === 'modal' ? ' game-modal-overlay--modal' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-drink-suggest-title"
      onClick={onCancel}
    >
      <div className="game-modal game-modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2 id="route-drink-suggest-title" className="game-modal__title flex items-center gap-2">
          <RouteDrinkIcon size={14} aria-hidden /> {ROUTE_DRINK_LABEL}
        </h2>
        <p className="game-modal__text">
          {canUse ? (
            <>
              Receba na hora o loot de {ROUTE_DRINK_HOURS}h de Exploração AFK — baú animado e itens aplicados
              direto na conta.
            </>
          ) : (
            <>Você não tem {ROUTE_DRINK_LABEL} no inventário.</>
          )}
        </p>
        <div className="game-inventory-item game-inventory-item--compact">
          <div className="game-inventory-item__icon">
            <RouteDrinkIcon size={28} />
          </div>
          <div className="game-inventory-item__info">
            <p className="game-inventory-item__count">
              Você tem <strong>{routeDrinkCount}</strong> no inventário
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <GameButton size="lg" className="w-full" disabled={using || !canUse} onClick={onConfirm}>
            {using ? 'Usando...' : 'Usar Todos'}
          </GameButton>
          <GameButton size="lg" variant="secondary" className="w-full" disabled={using} onClick={onCancel}>
            Agora não
          </GameButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
