import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coins, Store, Wand2 } from 'lucide-react';
import { PurchaseConfirmDialog, type PurchaseConfirmDetails } from '@/components/shop/PurchaseConfirmDialog';
import { GameButton } from '@/components/ui/GameButton';
import { PatrolShopItemRow } from '@/components/afk/patrol-shop/PatrolShopItemRow';
import { PatrolShopVendor } from '@/components/afk/patrol-shop/PatrolShopVendor';
import { PatrolBowTabIcon, PatrolSwordTabIcon } from '@/components/afk/patrol-shop/PatrolWeaponIcons';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { equipPatrolWeapon, getPatrolShop, purchasePatrolWeapon } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { playEquip, playPurchase } from '@/lib/sounds';
import { CURRENCY_NAME, type ArmaPreferida, type PatrolShopCatalogItem, type PatrolShopResponse, type PatrolWeaponKind } from '@/types';
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
      showGameToast(getErrorMessage(err, 'Não foi possível abrir a loja da exploração.'), { variant: 'error' });
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
      await refreshApp();
      playPurchase();
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 1200);
      showGameToast(`${item.nome} comprado!`, { variant: 'success' });
      if (item.kind === 'arco' || item.kind === 'espada') {
        onWeaponChange?.(item.kind);
      }
      setPurchaseConfirm(null);
      await load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível comprar este item.'), { variant: 'error' });
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
    if (item.kind !== 'arco' && item.kind !== 'espada') return;
    setBusyId(item.id);
    try {
      const res = await equipPatrolWeapon(item.kind, item.id);
      applyUser(res.user);
      await refreshApp();
      playEquip();
      onWeaponChange?.(item.kind);
      showGameToast(`${item.nome} equipado!`, { variant: 'success' });
      await load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível equipar este item.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  const items =
    activeTab === 'arco' ? catalog?.arcos ?? [] : activeTab === 'espada' ? catalog?.espadas ?? [] : [];

  return createPortal(
    <div className="game-modal-overlay game-patrol-shop-overlay" onClick={onClose} role="presentation">
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
              <p className="game-patrol-shop-header__subtitle">Armas para sua exploração automática</p>
            </div>
            <span className="game-patrol-shop-header__coins">
              <Coins size={16} aria-hidden /> {catalog?.abdoria ?? '—'} {CURRENCY_NAME}
            </span>
          </header>

          <PatrolShopVendor activeTab={activeTab} celebrating={celebrating} />

          <nav className="game-patrol-shop-nav" aria-label="Categorias da loja">
            {TABS.map(({ id, label, kind }) => (
              <button
                key={id}
                type="button"
                className={`game-patrol-shop-nav__btn game-patrol-shop-nav__btn--${kind}${activeTab === id ? ' game-patrol-shop-nav__btn--active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                {kind === 'arco' && <PatrolBowTabIcon className="game-patrol-shop-nav__icon" />}
                {kind === 'espada' && <PatrolSwordTabIcon className="game-patrol-shop-nav__icon" />}
                {kind === 'magia' && <Wand2 size={14} aria-hidden />}
                {label}
              </button>
            ))}
          </nav>

          <div className="game-patrol-shop-body">
            {loading ? (
              <p className="game-loader">Carregando armas...</p>
            ) : activeTab === 'magia' ? (
              <div className="game-patrol-shop-future">
                <div className="game-patrol-shop-future__icon" aria-hidden>
                  <Wand2 size={34} strokeWidth={2} />
                </div>
                <h3>Futuramente</h3>
                <p>Magias e feitiços chegarão em uma atualização da exploração. Fique de olho!</p>
              </div>
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
          <GameButton variant="secondary" className="game-patrol-shop-modal__close game-modal__close" onClick={onClose}>
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
