import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Star } from 'lucide-react';
import { getBestiary, type BestiaryResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { SlimePortrait } from '@/components/afk/SlimePortrait';
import { BestiaryDropList } from '@/components/bestiary/BestiaryDropList';
import type { AfkEnemyId } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  layer?: 'default' | 'modal';
}

function tierLabel(tier: string) {
  if (tier === 'boss') return 'Chefe';
  if (tier === 'elite') return 'Elite';
  if (tier === 'golden') return 'Especial';
  return 'Comum';
}

interface DropsPopupProps {
  entry: BestiaryResponse['categorias'][number]['entries'][number];
  onClose: () => void;
}

function DropsPopup({ entry, onClose }: DropsPopupProps) {
  return (
    <motion.div
      className="game-bestiary-drops-popup"
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="game-bestiary-drops-popup__head">
        <span className="game-bestiary-drops-popup__title">Drops de {entry.label}</span>
        <button
          type="button"
          className="game-bestiary-drops-popup__close"
          onClick={onClose}
          aria-label="Fechar drops"
        >
          <X size={14} />
        </button>
      </div>
      <BestiaryDropList drops={entry.drops} />
    </motion.div>
  );
}

function BestiarySectionCarousel({
  category,
}: {
  category: BestiaryResponse['categorias'][number];
}) {
  const [index, setIndex] = useState(0);
  const [dropsOpen, setDropsOpen] = useState(false);
  const count = category.entries.length;
  const entry = category.entries[index] ?? category.entries[0];
  const isGolden = category.id === 'golden';

  useEffect(() => {
    setIndex(0);
    setDropsOpen(false);
  }, [category.id]);

  useEffect(() => {
    setDropsOpen(false);
  }, [index]);

  if (!entry) return null;

  const goPrev = () => setIndex((i) => (i - 1 + count) % count);
  const goNext = () => setIndex((i) => (i + 1) % count);

  return (
    <section className={`game-bestiary-section${isGolden ? ' game-bestiary-section--golden' : ''}`}>
      {isGolden && (
        <div className="game-bestiary-section__golden-banner">
          <Star size={12} aria-hidden />
          <span>Inimigo Especial</span>
          <Star size={12} aria-hidden />
        </div>
      )}
      {!isGolden && (
        <div className="game-bestiary-section__head">
          <h3 className="game-bestiary-section__title">{category.label}</h3>
          {count > 1 && (
            <span className="game-bestiary-section__counter">{index + 1}/{count}</span>
          )}
        </div>
      )}

      <div className="game-bestiary-carousel">
        {count > 1 && (
          <button
            type="button"
            className="game-bestiary-carousel__nav game-bestiary-carousel__nav--prev"
            onClick={goPrev}
            aria-label="Inimigo anterior"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.article
            key={entry.id}
            className={[
              'game-bestiary-card',
              entry.desbloqueado ? 'game-bestiary-card--unlocked' : 'game-bestiary-card--locked',
              isGolden ? 'game-bestiary-card--golden' : '',
            ].filter(Boolean).join(' ')}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="game-bestiary-card__portrait-wrap">
              {entry.desbloqueado ? (
                <button
                  type="button"
                  className={`game-bestiary-card__portrait game-bestiary-card__portrait--button${dropsOpen ? ' game-bestiary-card__portrait--active' : ''}`}
                  onClick={() => setDropsOpen((v) => !v)}
                  aria-expanded={dropsOpen}
                  aria-label={dropsOpen ? 'Ocultar drops' : 'Ver drops'}
                >
                  <SlimePortrait enemyId={entry.id as AfkEnemyId} locked={false} />
                </button>
              ) : (
                <div className="game-bestiary-card__portrait">
                  <SlimePortrait enemyId={entry.id as AfkEnemyId} locked />
                </div>
              )}

              <AnimatePresence>
                {dropsOpen && entry.desbloqueado && (
                  <DropsPopup entry={entry} onClose={() => setDropsOpen(false)} />
                )}
              </AnimatePresence>
            </div>

            <div className="game-bestiary-card__meta">
              <span className={`game-bestiary-card__tier game-bestiary-card__tier--${entry.desbloqueado ? entry.tier : 'locked'}`}>
                {entry.desbloqueado ? tierLabel(entry.tier) : 'Desconhecido'}
              </span>
              <h4>{entry.desbloqueado ? entry.label : '???'}</h4>
              {!entry.desbloqueado && (
                <p className="game-bestiary-card__locked-hint">
                  Derrote na Exploração AFK para revelar.
                </p>
              )}
              {entry.desbloqueado && (
                <p className="game-bestiary-card__drops-hint">
                  Toque no retrato para ver drops
                </p>
              )}
            </div>
          </motion.article>
        </AnimatePresence>

        {count > 1 && (
          <button
            type="button"
            className="game-bestiary-carousel__nav game-bestiary-carousel__nav--next"
            onClick={goNext}
            aria-label="Próximo inimigo"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="game-bestiary-dots" role="tablist" aria-label={`${category.label} — navegação`}>
          {category.entries.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={item.desbloqueado ? item.label : 'Inimigo bloqueado'}
              className={`game-bestiary-dots__dot${dotIndex === index ? ' game-bestiary-dots__dot--active' : ''}${item.desbloqueado ? '' : ' game-bestiary-dots__dot--locked'}`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function BestiaryModal({ open, onClose, layer = 'default' }: Props) {
  const [data, setData] = useState<BestiaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getBestiary());
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar o bestiário.'), { variant: 'error' });
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

  if (!open) return null;

  const unlockedCount = data?.desbloqueados.length ?? 0;
  const total = data?.total_inimigos ?? 0;

  // Split golden category for special rendering at end
  const regularCategories = data?.categorias.filter((c) => c.id !== 'golden') ?? [];
  const goldenCategory = data?.categorias.find((c) => c.id === 'golden');

  return createPortal(
    <div
      className={`game-modal-overlay game-bestiary-overlay${layer === 'modal' ? ' game-bestiary-overlay--modal' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        className="game-modal game-bestiary-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bestiary-title"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="game-modal__close-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        <header className="game-bestiary-modal__head">
          <h2 id="bestiary-title" className="game-modal__title">Bestiário</h2>
          <p className="game-modal__text">
            {unlockedCount}/{total} descobertos
            {data ? ` · +${data.bonus_cap_diario} XP/dia de bônus` : ''}
          </p>
        </header>

        {loading ? (
          <p className="game-loader">Carregando bestiário...</p>
        ) : (
          <div className="game-bestiary-scroll">
            {regularCategories.map((category) => (
              <BestiarySectionCarousel key={category.id} category={category} />
            ))}
            {goldenCategory && (
              <BestiarySectionCarousel key="golden" category={goldenCategory} />
            )}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
