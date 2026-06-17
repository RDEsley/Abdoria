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
import { ShopPreviewStage } from '@/components/shop/ShopPreviewStage';
import { GameButton } from '@/components/ui/GameButton';
import { SwipeScroll } from '@/components/ui/SwipeScroll';
import { equipCosmetic, getShop, purchaseCosmetic } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { playEquip, playPurchase, setSfxPack } from '@/lib/sounds';
import type { CosmeticKind, ShopCatalogItem, ShopResponse } from '@/types';
import {
  ABDORIA_XP_STEP,
  CURRENCY_NAME,
  resolveCosmeticos,
  SHOP_ABDORIA_COST_PER_XP,
  SHOP_XP_COST_PER_ABDORIA,
  xpLevelFromTotal,
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const xpLevel = user ? xpLevelFromTotal(user.gamificacao.nivel_xp) : 1;
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);

  const hasPreviewOverrides = useMemo(() => {
    return (
      (preview.avatar !== undefined && preview.avatar !== cosmeticos.avatar_equipado) ||
      (preview.borda !== undefined && preview.borda !== cosmeticos.borda_equipada) ||
      (preview.titulo !== undefined && preview.titulo !== (cosmeticos.titulo_equipado ?? undefined)) ||
      (preview.fundo !== undefined && preview.fundo !== cosmeticos.fundo_equipado) ||
      (preview.som !== undefined && preview.som !== cosmeticos.som_equipado) ||
      (preview.efeito !== undefined && preview.efeito !== cosmeticos.efeito_equipado)
    );
  }, [preview, cosmeticos]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShop();
      setCatalog(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível abrir a loja.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPreview({});
    setActiveSection('shop-avatares');
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
  }, [open, loadCatalog, onClose]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 2000);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;

    const root = scrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (observerPausedRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id as ShopSectionId);
        }
      },
      { root, rootMargin: '-10% 0px -38% 0px', threshold: [0, 0.2, 0.45, 0.7] },
    );

    SECTIONS.forEach(({ id }) => {
      const node = root.querySelector(`#${id}`);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
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
      const rootTop = root.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      root.scrollTo({
        top: Math.max(0, root.scrollTop + (targetTop - rootTop) - 12),
        behavior: 'smooth',
      });
    }

    const navBtn = navRef.current?.querySelector<HTMLElement>(`[data-shop-section="${id}"]`);
    navBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    observerResumeTimer.current = window.setTimeout(() => {
      observerPausedRef.current = false;
      observerResumeTimer.current = null;
    }, 700);
  }, []);

  const syncUser = async (nextUser: import('@/types').IUserDocument) => {
    applyUser(nextUser);
    setSfxPack(nextUser.cosmeticos?.som_equipado ?? 'som_classico');
    await refreshApp();
    await loadCatalog();
  };

  const handlePreview = (item: ShopCatalogItem) => {
    setPreview((prev) => ({ ...prev, [item.kind]: item.id }));
  };

  const resetPreview = () => setPreview({});

  const handlePurchase = async (item: ShopCatalogItem) => {
    setBusyId(item.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await purchaseCosmetic(item.id);
      await syncUser(res.user);
      playPurchase();
      setSuccess(`${item.nome} comprado!`);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível comprar este item.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (item: ShopCatalogItem) => {
    setBusyId(item.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await equipCosmetic(item.kind, item.id);
      await syncUser(res.user);
      playEquip();
      setPreview((prev) => {
        const next = { ...prev };
        delete next[item.kind];
        return next;
      });
      setSuccess(`${item.nome} equipado!`);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível equipar este item.'));
    } finally {
      setBusyId(null);
    }
  };

  const isPreviewingItem = (item: ShopCatalogItem) => preview[item.kind] === item.id;

  if (!open) return null;

  return createPortal(
    <div className="game-modal-overlay game-shop-overlay" onClick={onClose} role="presentation">
      <div
        className="game-modal game-shop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cosmetics-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="game-shop-header">
          <div>
            <h2 id="cosmetics-title" className="game-shop-header__title">
              Loja Abdoria
            </h2>
            <p className="game-shop-header__subtitle">Personalize seu perfil · teste antes de equipar</p>
          </div>
          <span className="game-shop-header__coins">
            <Coins size={16} /> {catalog?.abdoria ?? cosmeticos.moedas} {CURRENCY_NAME}
          </span>
        </header>

        <ul className="game-economy-rules game-economy-rules--compact">
          <li>Você recebe 1 {CURRENCY_NAME} a cada {ABDORIA_XP_STEP} XP ganhos</li>
          <li>Loja diária: {SHOP_XP_COST_PER_ABDORIA} XP → 1 {CURRENCY_NAME} · {SHOP_ABDORIA_COST_PER_XP} {CURRENCY_NAME} → 1 XP</li>
          <li>Streak, conquistas e habilidades = XP extra (fora do teto diário)</li>
        </ul>

        <ShopPreviewStage
          user={user}
          firstName={firstName}
          xpLevel={xpLevel}
          abdoria={catalog?.abdoria ?? cosmeticos.moedas}
          currencyName={CURRENCY_NAME}
          preview={preview}
          hasPreviewOverrides={hasPreviewOverrides}
          onResetPreview={resetPreview}
        />

        {error && <p className="game-login__error mt-3">{error}</p>}
        {success && <p className="game-modal__success mt-3">{success}</p>}

        <div ref={scrollRef} className="game-shop-scroll">
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
                    catalogByKind(catalog, kind).map((item) => (
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
                    ))}
                </div>
              </section>
            ))
          )}
        </div>

        <GameButton variant="secondary" className="game-modal__close" onClick={onClose}>
          Fechar
        </GameButton>
      </div>
    </div>,
    document.body,
  );
}
