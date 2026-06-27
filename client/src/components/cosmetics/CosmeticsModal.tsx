import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Coins,
  Crown,
  Frame,
  Image,
  Music,
  UserRound,
  Wand2,
} from 'lucide-react';
import { ShopItemRow } from '@/components/shop/ShopItemRow';
import { AbdoriaCoinsGuideOverlay } from '@/components/shop/AbdoriaCoinsGuideOverlay';
import { ShopPreviewStage } from '@/components/shop/ShopPreviewStage';
import { GameButton } from '@/components/ui/GameButton';
import { SwipeScroll } from '@/components/ui/SwipeScroll';
import { equipCosmetic, getShop, purchaseCosmetic } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { playEquip, playPurchase, previewSfxPack, setSfxPack } from '@/lib/sounds';
import type { CosmeticKind, ShopCatalogItem, ShopResponse } from '@/types';
import {
  COSMETIC_RARITY_LABELS,
  CURRENCY_NAME,
  groupCosmeticCatalogByRarity,
  resolveCosmeticos,
} from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type ShopSectionId =
  | 'shop-avatares'
  | 'shop-bordas'
  | 'shop-titulos'
  | 'shop-fundos'
  | 'shop-sons'
  | 'shop-efeitos';

type PreviewState = Partial<Record<CosmeticKind, string>>;

const SECTIONS: {
  id: ShopSectionId;
  kind: CosmeticKind;
  label: string;
  icon: typeof UserRound;
}[] = [
  { id: 'shop-avatares', kind: 'avatar', label: 'Ícones', icon: UserRound },
  { id: 'shop-bordas', kind: 'borda', label: 'Bordas', icon: Frame },
  { id: 'shop-titulos', kind: 'titulo', label: 'Títulos', icon: Crown },
  { id: 'shop-fundos', kind: 'fundo', label: 'Fundos', icon: Image },
  { id: 'shop-sons', kind: 'som', label: 'Sons', icon: Music },
  { id: 'shop-efeitos', kind: 'efeito', label: 'Efeitos', icon: Wand2 },
];

function catalogByKind(catalog: ShopResponse, kind: CosmeticKind): ShopCatalogItem[] {
  const map: Record<CosmeticKind, ShopCatalogItem[]> = {
    avatar: catalog.avatares,
    borda: catalog.bordas,
    titulo: catalog.titulos,
    fundo: catalog.fundos ?? [],
    som: catalog.sons,
    efeito: catalog.efeitos,
  };
  return map[kind] ?? [];
}

export function CosmeticsModal({ open, onClose }: Props) {
  const { user: authUser, applyUser } = useAuth();
  const { user: appUser, refresh: refreshApp } = useApp();
  const user = appUser ?? authUser;
  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const observerPausedRef = useRef(false);
  const observerResumeTimer = useRef<number | null>(null);

  const [activeSection, setActiveSection] = useState<ShopSectionId>('shop-avatares');
  const [preview, setPreview] = useState<PreviewState>({});
  const [catalog, setCatalog] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coinsGuideOpen, setCoinsGuideOpen] = useState(false);

  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);

  const hasPreviewOverrides = useMemo(() => {
    return (
      (preview.avatar !== undefined && preview.avatar !== cosmeticos.avatar_equipado) ||
      (preview.borda !== undefined && preview.borda !== cosmeticos.borda_equipada) ||
      (preview.titulo !== undefined && preview.titulo !== (cosmeticos.titulo_equipado ?? undefined)) ||
      (preview.fundo !== undefined && preview.fundo !== cosmeticos.fundo_equipado) ||
      (preview.efeito !== undefined && preview.efeito !== cosmeticos.efeito_equipado)
    );
  }, [preview, cosmeticos]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShop();
      setCatalog(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível abrir a loja.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPreview({});
    setActiveSection('shop-avatares');
    setCoinsGuideOpen(false);
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

  useEffect(() => {
    if (!open || !scrollRef.current) return;

    const root = scrollRef.current;

    const updateActiveSection = () => {
      if (observerPausedRef.current) return;
      const marker = root.scrollTop + 20;
      let next: ShopSectionId = SECTIONS[0].id;

      for (const { id } of SECTIONS) {
        const node = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (node && node.offsetTop <= marker) {
          next = id;
        }
      }

      setActiveSection(next);
    };

    updateActiveSection();
    root.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => root.removeEventListener('scroll', updateActiveSection);
  }, [open, loading, catalog]);

  const scrollToSection = useCallback((id: ShopSectionId) => {
    setActiveSection(id);
    observerPausedRef.current = true;
    if (observerResumeTimer.current !== null) {
      window.clearTimeout(observerResumeTimer.current);
    }

    const root = scrollRef.current;
    const target = root?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (root && target) {
      const top = root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top - 6;
      root.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth',
      });
    }

    const navEl = navRef.current;
    const navBtn = navEl?.querySelector<HTMLElement>(`[data-shop-section="${id}"]`);
    if (navEl && navBtn) {
      const left = navBtn.offsetLeft - (navEl.clientWidth - navBtn.offsetWidth) / 2;
      navEl.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }

    observerResumeTimer.current = window.setTimeout(() => {
      observerPausedRef.current = false;
      observerResumeTimer.current = null;
    }, 900);
  }, []);

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

  const handlePurchase = async (item: ShopCatalogItem) => {
    setBusyId(item.id);
    try {
      const res = await purchaseCosmetic(item.id);
      await syncUser(res.user);
      playPurchase();
      showGameToast(`${item.nome} comprado!`, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível comprar este item.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (item: ShopCatalogItem) => {
    setBusyId(item.id);
    try {
      const res = await equipCosmetic(item.kind, item.id);
      await syncUser(res.user);
      playEquip();
      setPreview((prev) => {
        const next = { ...prev };
        delete next[item.kind];
        return next;
      });
      showGameToast(`${item.nome} equipado!`, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível equipar este item.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const isPreviewingItem = (item: ShopCatalogItem) => preview[item.kind] === item.id;

  if (!open) return null;

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
                Loja Abdoria
              </h2>
              <p className="game-shop-header__subtitle">Personalize seu perfil</p>
            </div>
            <button
              type="button"
              className="game-shop-header__coins"
              onClick={() => setCoinsGuideOpen(true)}
              aria-label={`${catalog?.abdoria ?? cosmeticos.moedas} ${CURRENCY_NAME}. Toque para ver como ganhar mais`}
            >
              <Coins size={16} aria-hidden /> {catalog?.abdoria ?? cosmeticos.moedas} {CURRENCY_NAME}
            </button>
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
              ref={navRef}
              as="nav"
              className="game-shop-nav"
              aria-label="Filtrar seções da loja"
              prevLabel="Ver seções anteriores"
              nextLabel="Ver mais seções"
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  data-shop-section={id}
                  className={`game-shop-nav__btn ${activeSection === id ? 'game-shop-nav__btn--active' : ''}`}
                  onClick={() => scrollToSection(id)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </SwipeScroll>

            <div ref={scrollRef} className="game-shop-scroll">
              {loading ? (
                <p className="game-loader mt-6">Carregando catálogo...</p>
              ) : (
                SECTIONS.map(({ id, kind, label, icon: Icon }) => (
                  <section key={id} id={id} className="game-shop-section game-shop-section--anchored">
                    <div className="game-shop-section__head">
                      <div className="game-shop-section__ornament" aria-hidden />
                      <h3 className="game-shop-section__title">
                        <Icon size={16} /> {label}
                      </h3>
                      <div className="game-shop-section__ornament game-shop-section__ornament--mirror" aria-hidden />
                    </div>

                    <div className="game-shop-list">
                      {catalog &&
                        (() => {
                          const items = catalogByKind(catalog, kind);
                          const groups = groupCosmeticCatalogByRarity(items);
                          const showRarityLabels = groups.length > 1;

                          return groups.flatMap(({ raridade, items: groupItems }) => {
                            const nodes = groupItems.map((item) => (
                              <ShopItemRow
                                key={item.id}
                                item={item}
                                letter={firstName}
                                busy={busyId === item.id}
                                isPreviewing={isPreviewingItem(item)}
                                onPreview={() => handlePreview(item)}
                                onEquip={() => void handleEquip(item)}
                                onPurchase={() => void handlePurchase(item)}
                              />
                            ));

                            if (!showRarityLabels) return nodes;

                            return [
                              <p
                                key={`rarity-${kind}-${raridade}`}
                                className={`game-shop-rarity-label game-shop-rarity-label--${raridade}`}
                              >
                                {COSMETIC_RARITY_LABELS[raridade]}
                              </p>,
                              ...nodes,
                            ];
                          });
                        })()}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>

          <footer className="game-shop-modal__footer">
            <GameButton variant="secondary" className="game-shop-modal__close game-modal__close" onClick={onClose}>
              Fechar
            </GameButton>
          </footer>
        </div>
      </div>

      <AbdoriaCoinsGuideOverlay open={coinsGuideOpen} onClose={() => setCoinsGuideOpen(false)} />
    </>,
    document.body,
  );
}
