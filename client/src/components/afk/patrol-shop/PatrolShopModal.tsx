import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BowArrow,
  Coins,
  PackageOpen,
  Store,
  Swords,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  PurchaseConfirmDialog,
  type PurchaseConfirmDetails,
} from '@/components/shop/PurchaseConfirmDialog';
import { GameButton } from '@/components/ui/GameButton';
import { PatrolShopItemRow } from '@/components/afk/patrol-shop/PatrolShopItemRow';
import { PatrolShopVendor } from '@/components/afk/patrol-shop/PatrolShopVendor';
import {
  PatrolMaterialMarket,
  type MaterialRarityFilter,
} from '@/components/afk/patrol-shop/PatrolMaterialMarket';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import {
  equipPatrolWeapon,
  getPatrolShop,
  purchasePatrolWeapon,
  sellPatrolMaterial,
  sellPatrolMaterialsBulk,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { playEquip, playPurchase } from '@/lib/sounds';
import {
  CURRENCY_NAME,
  type ArmaPreferida,
  type PatrolShopCatalogItem,
  type PatrolShopResponse,
  type PatrolWeaponKind,
  type SlimeMaterialStockItem,
} from '@/types';
import './patrol-shop.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onWeaponChange?: (weapon: ArmaPreferida) => void;
}

type TabId = PatrolWeaponKind | 'materials';

const MATERIAL_FILTER_LABEL: Record<MaterialRarityFilter, string> = {
  all: 'todas as raridades',
  comum: 'comum',
  raro: 'raro',
  epico: 'épico',
  mitico: 'mítico',
};

const TABS: {
  id: TabId;
  label: string;
  kind: TabId;
  icon: LucideIcon;
}[] = [
  { id: 'arco', label: 'Arcos', kind: 'arco', icon: BowArrow },
  { id: 'espada', label: 'Espadas', kind: 'espada', icon: Swords },
  { id: 'magia', label: 'Magias', kind: 'magia', icon: WandSparkles },
  { id: 'materials', label: 'Materiais', kind: 'materials', icon: PackageOpen },
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
  const [materialSaleConfirm, setMaterialSaleConfirm] = useState<{
    item: SlimeMaterialStockItem;
    quantity: number | 'all';
    details: PurchaseConfirmDetails;
  } | null>(null);
  const [bulkSaleConfirm, setBulkSaleConfirm] = useState<{
    rarity: MaterialRarityFilter;
    details: PurchaseConfirmDetails;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPatrolShop();
      setCatalog(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível abrir a Loja da Vila.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setPurchaseConfirm(null);
      setMaterialSaleConfirm(null);
      setBulkSaleConfirm(null);
      setBusyId(null);
      setCelebrating(false);
      return;
    }
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
      // A resposta já traz o catálogo autoritativo. Isso desmarca a categoria
      // anterior ao trocar, além de marcar o item novo sem uma segunda busca.
      setCatalog(res.shop);
      playEquip();
      onWeaponChange?.(item.kind);
      showGameToast(`${item.nome} equipado!`, { variant: 'success' });
      void refreshApp();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível equipar este item.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSellMaterial = async (item: SlimeMaterialStockItem, quantity: number | 'all') => {
    setBusyId(item.id);
    try {
      const response = await sellPatrolMaterial(item.id, quantity);
      applyUser(response.user);
      setCatalog(response.shop);
      playPurchase();
      showGameToast(
        `${response.quantity_sold}× ${item.name} vendido por ${response.coins_gained} Coins.`,
        { variant: 'success' },
      );
      setMaterialSaleConfirm(null);
      void refreshApp();
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível vender este material.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const requestMaterialSale = (item: SlimeMaterialStockItem, quantity: number | 'all') => {
    const quantityToSell = quantity === 'all' ? item.quantity : Math.min(item.quantity, quantity);
    if (quantityToSell <= 1 && item.rarity !== 'epico' && item.rarity !== 'mitico') {
      void handleSellMaterial(item, quantityToSell);
      return;
    }
    setMaterialSaleConfirm({
      item,
      quantity,
      details: {
        itemName: `${quantityToSell}× ${item.name}`,
        itemDescription:
          'Os materiais vendidos serão removidos da mochila e não poderão ser recuperados.',
        priceLabel: `Receber ${quantityToSell * item.sellPrice} Coins`,
        balanceHint: `Estoque atual: ${item.quantity}/99`,
      },
    });
  };

  const requestBulkSale = (rarity: MaterialRarityFilter) => {
    const selected = (catalog?.materials ?? []).filter(
      (material) => material.quantity > 0 && (rarity === 'all' || material.rarity === rarity),
    );
    const quantity = selected.reduce((total, material) => total + material.quantity, 0);
    const coins = selected.reduce(
      (total, material) => total + material.quantity * material.sellPrice,
      0,
    );
    if (quantity < 1) return;
    setBulkSaleConfirm({
      rarity,
      details: {
        itemName: `${quantity} materiais selecionados`,
        itemDescription:
          'Os materiais da raridade escolhida serão removidos da mochila e não poderão ser recuperados.',
        priceLabel: `Receber ${coins} Coins`,
        balanceHint: `Filtro: ${MATERIAL_FILTER_LABEL[rarity]}`,
      },
    });
  };

  const handleBulkSale = async () => {
    if (!bulkSaleConfirm) return;
    setBusyId('bulk');
    try {
      const response = await sellPatrolMaterialsBulk(bulkSaleConfirm.rarity);
      applyUser(response.user);
      setCatalog(response.shop);
      playPurchase();
      showGameToast(
        `${response.quantity_sold} materiais vendidos por ${response.coins_gained} Coins.`,
        { variant: 'success' },
      );
      setBulkSaleConfirm(null);
      void refreshApp();
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível vender os materiais.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  const weaponItems =
    activeTab === 'arco'
      ? (catalog?.arcos ?? [])
      : activeTab === 'espada'
        ? (catalog?.espadas ?? [])
        : activeTab === 'magia'
          ? (catalog?.magias ?? [])
          : [];

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
                <Store size={18} aria-hidden /> Loja da Vila
              </h2>
              <p className="game-patrol-shop-header__subtitle">
                Armas e comércio de materiais da sua jornada
              </p>
            </div>
            <span className="game-patrol-shop-header__coins">
              <Coins size={16} aria-hidden /> {catalog?.abdoria ?? '—'} {CURRENCY_NAME}
            </span>
          </header>

          <PatrolShopVendor celebrating={celebrating} />

          <nav className="game-patrol-shop-nav" aria-label="Categorias da loja">
            {TABS.map(({ id, label, kind, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`game-patrol-shop-nav__btn game-patrol-shop-nav__btn--${kind}${activeTab === id ? ' game-patrol-shop-nav__btn--active' : ''}`}
                aria-pressed={activeTab === id}
                aria-label={label}
                title={label}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={15} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="game-patrol-shop-body">
            {loading ? (
              <p className="game-loader">Carregando mercadorias...</p>
            ) : activeTab === 'materials' ? (
              <PatrolMaterialMarket
                materials={catalog?.materials ?? []}
                busyId={busyId}
                onSell={requestMaterialSale}
                onSellBulk={requestBulkSale}
              />
            ) : weaponItems.length === 0 ? (
              <p className="game-patrol-shop-empty">Nenhum item nesta categoria ainda.</p>
            ) : (
              <div className="game-patrol-shop-list">
                {weaponItems.map((item) => (
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
      <PurchaseConfirmDialog
        open={!!materialSaleConfirm}
        details={materialSaleConfirm?.details ?? null}
        busy={!!materialSaleConfirm && busyId === materialSaleConfirm.item.id}
        title="Confirmar venda"
        confirmLabel="Vender"
        busyLabel="Vendendo…"
        onConfirm={() =>
          materialSaleConfirm &&
          void handleSellMaterial(materialSaleConfirm.item, materialSaleConfirm.quantity)
        }
        onCancel={() => {
          if (!busyId) setMaterialSaleConfirm(null);
        }}
      />
      <PurchaseConfirmDialog
        open={!!bulkSaleConfirm}
        details={bulkSaleConfirm?.details ?? null}
        busy={busyId === 'bulk'}
        title="Confirmar venda em lote"
        confirmLabel="Vender selecionados"
        busyLabel="Vendendo…"
        onConfirm={() => void handleBulkSale()}
        onCancel={() => {
          if (!busyId) setBulkSaleConfirm(null);
        }}
      />
    </div>,
    document.body,
  );
}
