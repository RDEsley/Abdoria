import { ShoppingBag } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { actionHaptic } from '@/lib/platform/native-runtime';
import { GameLeafIcon } from '@/components/ui/CurrencyIcon';

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
  title?: string;
  confirmLabel?: string;
  busyLabel?: string;
}

export function PurchaseConfirmDialog({
  open,
  details,
  busy,
  onConfirm,
  onCancel,
  title = 'Confirmar compra',
  confirmLabel = 'Confirmar',
  busyLabel = 'Comprando…',
}: Props) {
  if (!open || !details) return null;

  return (
    <Modal
      open
      onClose={onCancel}
      role="alertdialog"
      labelledBy="purchase-confirm-title"
      describedBy="purchase-confirm-desc"
      overlayClassName="game-purchase-confirm-overlay"
      panelClassName="game-purchase-confirm"
      disableDismiss={busy}
    >
      <h2 id="purchase-confirm-title" className="game-modal__title game-purchase-confirm__title">
        <ShoppingBag size={14} aria-hidden /> {title}
      </h2>

      <div className="game-purchase-confirm__card">
        <p className="game-purchase-confirm__name">{details.itemName}</p>
        {details.itemDescription && (
          <p id="purchase-confirm-desc" className="game-purchase-confirm__desc">
            {details.itemDescription}
          </p>
        )}
        <p className="game-purchase-confirm__price">
          <GameLeafIcon size={16} aria-hidden />
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
        <GameButton
          className="flex-1"
          disabled={busy}
          onClick={() => {
            void actionHaptic();
            onConfirm();
          }}
        >
          {busy ? busyLabel : confirmLabel}
        </GameButton>
      </div>
    </Modal>
  );
}
