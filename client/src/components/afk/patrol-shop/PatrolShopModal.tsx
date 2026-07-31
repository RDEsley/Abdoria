import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coins, Store } from 'lucide-react';
import {
  PurchaseConfirmDialog,
  type PurchaseConfirmDetails,
} from '@/components/shop/PurchaseConfirmDialog';
import { GameButton } from '@/components/ui/GameButton';
import { PatrolShopItemRow } from '@/components/afk/patrol-shop/PatrolShopItemRow';
import { PatrolShopVendor } from '@/components/afk/patrol-shop/PatrolShopVendor';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { equipPatrolWeapon, getPatrolShop, purchasePatrolWeapon } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { playEquip, playPurchase } from '@/lib/sounds';
import {
  CURRENCY_NAME,
  type ArmaPreferida,
  type PatrolShopCatalogItem,
  type PatrolShopResponse,
  type PatrolWeaponKind,
} from '@/types';
import './patrol-shop.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onWeaponChange?: (weapon: ArmaPreferida) => void;
}

type TabId = PatrolWeaponKind;

const TABS: { id: TabId; label: string; kind: 'arco' | 'espada' | 'magia' }[] = [
  { id: 'arco', label: 'Arcos', kind: 'arco' },
  { id: 'espada', label: 'Espadas', kind: 'espada' },
  { id: 'magia', label: 'Magias', kind: 'magia' },
];

export function PatrolShopModal({ open, onClose, onWeaponChange }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [catalog, setCatalog] = useState<PatrolShopResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('arco');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [purchaseConfirm, setPurchaseConfirm] = useState<{
    item: PatrolShopCatalogItem;
    details: PurchaseConfirmDetails;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPatrolShop();
      setCatalog(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível abrir a loja da exploração.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handlePurchase = async (item: PatrolShopCatalogItem) => {
    setBusyId(item.id);
    try {
      const res = await purchasePatrolWeapon(item.id);
      applyUser(res.user);
      playPurchase();
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 1200);
      showGameToast(`${item.nome} comprado!`, { variant: 'success' });
      onWeaponChange?.(item.kind);
      setPurchaseConfirm(null);
      void refreshApp();
      void load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível comprar este item.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const requestPurchase = (item: PatrolShopCatalogItem) => {
    if (item.unlock.tipo !== 'moedas') return;
    setPurchaseConfirm({
      item,
      details: {
        itemName: item.nome,
        itemDescription: item.descricao,
        priceLabel: `${item.unlock.preco_moedas} ${CURRENCY_NAME}`,
        balanceHint: catalog ? `Saldo atual: ${catalog.abdoria} ${CURRENCY_NAME}` : undefined,
      },
    });
  };

  const handleEquip = async (item: PatrolShopCatalogItem) => {
    setBusyId(item.id);
    try {
      const res = await equipPatrolWeapon(item.kind, item.id);
      applyUser(res.user);
      // Feedback imediato: marca o item como equipado no catálogo local na
      // hora, sem esperar o refresh do app + reload do catálogo (2 idas a
      // mais ao servidor) — "Equipar" só virava "Em uso" depois de tudo
      // isso terminar, dando a sensação de loja travada/lenta.
      setCatalog((prev) => {
        if (!prev) return prev;
        const key = item.kind === 'arco' ? 'arcos' : item.kind === 'espada' ? 'espadas' : 'magias';
        return {
          ...prev,
          [key]: prev[key].map((entry) => ({ ...entry, equipada: entry.id === item.id })),
        };
      });
      playEquip();
      onWeaponChange?.(item.kind);
      showGameToast(`${item.nome} equipado!`, { variant: 'success' });
      // Nada além de "quem tá equipado" muda ao equipar — sem motivo pra
      // recarregar o catálogo inteiro (e de novo pela API, com o loading
      // piscando por cima da lista que acabou de aparecer certa).
      void refreshApp();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível equipar este item.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  const items =
    activeTab === 'arco'
      ? (catalog?.arcos ?? [])
      : activeTab === 'espada'
        ? (catalog?.espadas ?? [])
        : (catalog?.magias ?? []);

  return createPortal(
    <div
      className="game-modal-overlay game-patrol-shop-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="game-modal game-patrol-shop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patrol-shop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-patrol-shop-modal__content">
          <header className="game-patrol-shop-header">
            <div>
              <h2 id="patrol-shop-title" className="game-patrol-shop-header__title">
                <Store size={18} aria-hidden /> Loja da Exploração
              </h2>
              <p className="game-patrol-shop-header__subtitle">
                Armas para sua exploração automática
              </p>
            </div>
            <span className="game-patrol-shop-header__coins">
              <Coins size={16} aria-hidden /> {catalog?.abdoria ?? '—'} {CURRENCY_NAME}
            </span>
          </header>

          <PatrolShopVendor celebrating={celebrating} />

          <nav className="game-patrol-shop-nav" aria-label="Categorias da loja">
            {TABS.map(({ id, label, kind }) => (
              <button
                key={id}
                type="button"
                className={`game-patrol-shop-nav__btn game-patrol-shop-nav__btn--${kind}${activeTab === id ? ' game-patrol-shop-nav__btn--active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="game-patrol-shop-body">
            {loading ? (
              <p className="game-loader">Carregando armas...</p>
            ) : items.length === 0 ? (
              <p className="game-patrol-shop-empty">Nenhum item nesta categoria ainda.</p>
            ) : (
              <div className="game-patrol-shop-list">
                {items.map((item) => (
                  <PatrolShopItemRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    onEquip={() => void handleEquip(item)}
                    onPurchase={() => requestPurchase(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="game-patrol-shop-modal__footer">
          <GameButton
            variant="secondary"
            className="game-patrol-shop-modal__close game-modal__close"
            onClick={onClose}
          >
            Fechar
          </GameButton>
        </footer>
      </div>

      <PurchaseConfirmDialog
        open={!!purchaseConfirm}
        details={purchaseConfirm?.details ?? null}
        busy={!!purchaseConfirm && busyId === purchaseConfirm.item.id}
        onConfirm={() => purchaseConfirm && void handlePurchase(purchaseConfirm.item)}
        onCancel={() => {
          if (!busyId) setPurchaseConfirm(null);
        }}
      />
    </div>,
    document.body,
  );
}
