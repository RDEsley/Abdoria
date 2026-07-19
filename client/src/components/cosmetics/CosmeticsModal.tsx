import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Frame, Image, Wand2 } from 'lucide-react';
import { ShopItemRow } from '@/components/shop/ShopItemRow';
import { ShopPreviewStage } from '@/components/shop/ShopPreviewStage';
import { GameButton } from '@/components/ui/GameButton';
import { SwipeScroll } from '@/components/ui/SwipeScroll';
import { equipShopItem, getShop } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { playEquip, playTabSwitch, previewSfxPack, setSfxPack } from '@/lib/sounds';
import type { CosmeticKind, ShopCatalogItem, ShopResponse } from '@/types';
import { resolveCosmeticos } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type PreviewState = Partial<Record<CosmeticKind, string>>;

/** Uma aba por tópico (estilo personalização de perfil do Discord).
    Sons ficam nas Opções (Áudio), não aqui. */
const TABS: {
  kind: CosmeticKind;
  label: string;
  icon: typeof Frame;
}[] = [
  { kind: 'moldura_loja', label: 'Molduras', icon: Frame },
  { kind: 'titulo', label: 'Títulos', icon: Crown },
  { kind: 'banner', label: 'Banners', icon: Image },
  { kind: 'efeito', label: 'Efeitos', icon: Wand2 },
];

function catalogByKind(catalog: ShopResponse, kind: CosmeticKind): ShopCatalogItem[] {
  const map: Record<CosmeticKind, ShopCatalogItem[]> = {
    moldura_loja: catalog.molduras_loja,
    titulo: catalog.titulos,
    banner: catalog.banners ?? [],
    som: catalog.sons,
    efeito: catalog.efeitos,
  };
  return map[kind] ?? [];
}

export function CosmeticsModal({ open, onClose }: Props) {
  const { user: authUser, applyUser } = useAuth();
  const { user: appUser, refresh: refreshApp } = useApp();
  const user = appUser ?? authUser;

  const [activeTab, setActiveTab] = useState<CosmeticKind>('moldura_loja');
  const [preview, setPreview] = useState<PreviewState>({});
  const [catalog, setCatalog] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);

  const hasPreviewOverrides =
    (preview.moldura_loja !== undefined &&
      preview.moldura_loja !== cosmeticos.moldura_loja_equipada) ||
    (preview.titulo !== undefined && preview.titulo !== (cosmeticos.titulo_equipado ?? undefined)) ||
    (preview.banner !== undefined && preview.banner !== cosmeticos.banner_equipado) ||
    (preview.efeito !== undefined && preview.efeito !== cosmeticos.efeito_equipado);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShop();
      setCatalog(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar a personalização.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPreview({});
    setActiveTab('moldura_loja');
    void loadCatalog();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loadCatalog]);

  const syncUser = async (nextUser: import('@/types').IUserDocument) => {
    applyUser(nextUser);
    setSfxPack(nextUser.cosmeticos?.som_equipado ?? 'som_classico');
    await refreshApp();
    try {
      const data = await getShop();
      setCatalog(data);
    } catch {
      /* mantém catálogo anterior */
    }
  };

  const handlePreview = (item: ShopCatalogItem) => {
    if (item.kind === 'som') {
      previewSfxPack(item.id);
      return;
    }
    setPreview((prev) => ({ ...prev, [item.kind]: item.id }));
  };

  const resetPreview = () => setPreview({});

  const handleEquip = async (item: ShopCatalogItem) => {
    setBusyId(item.id);
    try {
      const res = await equipShopItem(item.kind, item.id);
      await syncUser(res.user);
      playEquip();
      setPreview((prev) => {
        const next = { ...prev };
        delete next[item.kind];
        return next;
      });
      showGameToast(`${item.nome} equipado!`, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível equipar este item.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const isPreviewingItem = (item: ShopCatalogItem) => preview[item.kind] === item.id;

  if (!open) return null;

  const activeItems = catalog ? catalogByKind(catalog, activeTab) : [];

  return createPortal(
    <>
      <div className="game-modal-overlay game-shop-overlay" onClick={onClose} role="presentation">
        <div
          className="game-modal game-shop-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cosmetics-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="game-shop-modal__content">
            <header className="game-shop-header">
              <div>
                <h2 id="cosmetics-title" className="game-shop-header__title">
                  Personalização do Perfil
                </h2>
                <p className="game-shop-header__subtitle">Deixe o perfil com a sua cara</p>
              </div>
            </header>

            <ShopPreviewStage
              user={user}
              firstName={firstName}
              preview={preview}
              hasPreviewOverrides={hasPreviewOverrides}
              onResetPreview={resetPreview}
            />

            <div className="game-shop-body">
              <SwipeScroll
                as="nav"
                className="game-shop-nav"
                aria-label="Categorias de personalização"
                prevLabel="Ver categorias anteriores"
                nextLabel="Ver mais categorias"
              >
                {TABS.map(({ kind, label, icon: Icon }) => (
                  <button
                    key={kind}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === kind}
                    className={`game-shop-nav__btn ${activeTab === kind ? 'game-shop-nav__btn--active' : ''}`}
                    onClick={() => {
                      playTabSwitch();
                      setActiveTab(kind);
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </SwipeScroll>

              <div className="game-shop-scroll" key={activeTab}>
                {loading ? (
                  <p className="game-loader mt-6">Carregando itens...</p>
                ) : (
                  <div className="game-shop-list">
                    {activeItems.map((item) => (
                      <ShopItemRow
                        key={item.id}
                        item={item}
                        busy={busyId === item.id}
                        isPreviewing={isPreviewingItem(item)}
                        onPreview={() => handlePreview(item)}
                        onEquip={() => void handleEquip(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="game-shop-modal__footer">
            <GameButton
              variant="secondary"
              className="game-shop-modal__close game-modal__close"
              onClick={onClose}
            >
              Fechar
            </GameButton>
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
