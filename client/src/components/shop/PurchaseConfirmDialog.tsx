import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coins, ShoppingBag } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';

export interface PurchaseConfirmDetails {
  itemName: string;
  itemDescription?: string;
  priceLabel: string;
  balanceHint?: string;
}

interface Props {
  open: boolean;
  details: PurchaseConfirmDetails | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PurchaseConfirmDialog({ open, details, busy, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open || !details) return null;

  return createPortal(
    <div
      className="game-modal-overlay game-purchase-confirm-overlay"
      onClick={busy ? undefined : onCancel}
      role="presentation"
    >
      <div
        className="game-modal game-purchase-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="purchase-confirm-title"
        aria-describedby="purchase-confirm-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="purchase-confirm-title" className="game-modal__title game-purchase-confirm__title">
          <ShoppingBag size={14} aria-hidden /> Confirmar compra
        </h2>

        <div className="game-purchase-confirm__card">
          <p className="game-purchase-confirm__name">{details.itemName}</p>
          {details.itemDescription && (
            <p id="purchase-confirm-desc" className="game-purchase-confirm__desc">
              {details.itemDescription}
            </p>
          )}
          <p className="game-purchase-confirm__price">
            <Coins size={14} aria-hidden />
            <span>{details.priceLabel}</span>
          </p>
          {details.balanceHint && (
            <p className="game-purchase-confirm__balance">{details.balanceHint}</p>
          )}
        </div>

        <div className="game-purchase-confirm__actions">
          <GameButton variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>
            Cancelar
          </GameButton>
          <GameButton className="flex-1" disabled={busy} onClick={onConfirm}>
            {busy ? 'Comprando…' : 'Confirmar'}
          </GameButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
