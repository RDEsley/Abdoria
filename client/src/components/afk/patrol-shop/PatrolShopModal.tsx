import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BowArrow, Coins, Store, Sword, Wand2 } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { PatrolShopItemRow } from '@/components/afk/patrol-shop/PatrolShopItemRow';
import { PatrolShopVendor } from '@/components/afk/patrol-shop/PatrolShopVendor';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { equipPatrolWeapon, getPatrolShop, purchasePatrolWeapon } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { playEquip, playPurchase } from '@/lib/sounds';
import type { ArmaPreferida, PatrolShopCatalogItem, PatrolShopResponse, PatrolWeaponKind } from '@/types';
import { CURRENCY_NAME } from '@/types';
import './patrol-shop.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onWeaponChange?: (weapon: ArmaPreferida) => void;
}

type TabId = PatrolWeaponKind;

const TABS: { id: TabId; label: string; icon: typeof BowArrow }[] = [
  { id: 'arco', label: 'Arcos', icon: BowArrow },
  { id: 'espada', label: 'Espadas', icon: Sword },
  { id: 'magia', label: 'Magias', icon: Wand2 },
];

export function PatrolShopModal({ open, onClose, onWeaponChange }: Props) {
  const { applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [catalog, setCatalog] = useState<PatrolShopResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('arco');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPatrolShop();
      setCatalog(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível abrir a loja da patrulha.'), { variant: 'error' });
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
      await load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível comprar este item.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
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
                <Store size={18} aria-hidden /> Loja da Patrulha
              </h2>
              <p className="game-patrol-shop-header__subtitle">Armas para sua patrulha automática</p>
            </div>
            <span className="game-patrol-shop-header__coins">
              <Coins size={16} aria-hidden /> {catalog?.abdoria ?? '—'} {CURRENCY_NAME}
            </span>
          </header>

          <PatrolShopVendor
            activeTab={activeTab}
            equippedArcoId={catalog?.armas.arco_equipado ?? 'arco_basico'}
            equippedEspadaId={catalog?.armas.espada_equipada ?? 'espada_basica'}
            celebrating={celebrating}
          />

          <nav className="game-patrol-shop-nav" aria-label="Categorias da loja">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`game-patrol-shop-nav__btn${activeTab === id ? ' game-patrol-shop-nav__btn--active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={14} aria-hidden />
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
                <p>Magias e feitiços chegarão em uma atualização da patrulha. Fique de olho!</p>
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
                    onPurchase={() => void handlePurchase(item)}
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
    </div>,
    document.body,
  );
}
