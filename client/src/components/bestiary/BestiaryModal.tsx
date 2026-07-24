import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Sparkles, X, Zap } from 'lucide-react';
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

type BestiaryEntry = BestiaryResponse['categorias'][number]['entries'][number];

interface BestiaryTileProps {
  entry: BestiaryEntry;
  categoryId: string;
  onSelect: (entryId: string) => void;
}

function BestiaryTile({ entry, categoryId, onSelect }: BestiaryTileProps) {
  const isGolden = categoryId === 'golden';
  return (
    <button
      type="button"
      className={[
        'game-bestiary-tile',
        entry.desbloqueado ? 'game-bestiary-tile--unlocked' : 'game-bestiary-tile--locked',
        isGolden ? 'game-bestiary-tile--golden' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(entry.id)}
    >
      <span className="game-bestiary-tile__portrait">
        <SlimePortrait enemyId={entry.id as AfkEnemyId} locked={!entry.desbloqueado} />
      </span>
      <span className="game-bestiary-tile__name">{entry.desbloqueado ? entry.label : '???'}</span>
    </button>
  );
}

interface BestiaryDetailProps {
  entry: BestiaryEntry;
  categoryId: string;
  onBack: () => void;
}

function BestiaryDetail({ entry, categoryId, onBack }: BestiaryDetailProps) {
  const isGolden = categoryId === 'golden';
  return (
    <motion.div
      key={entry.id}
      className="game-bestiary-detail"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.18 }}
    >
      <button type="button" className="game-bestiary-detail__back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> Voltar à lista
      </button>

      <div
        className={`game-bestiary-detail__portrait-wrap${isGolden ? ' game-bestiary-detail__portrait-wrap--golden' : ''}`}
      >
        <SlimePortrait enemyId={entry.id as AfkEnemyId} locked={!entry.desbloqueado} />
      </div>

      <span
        className={`game-bestiary-detail__tier game-bestiary-detail__tier--${entry.desbloqueado ? entry.tier : 'locked'}`}
      >
        {entry.desbloqueado ? tierLabel(entry.tier) : 'Desconhecido'}
      </span>
      <h3 className="game-bestiary-detail__name">{entry.desbloqueado ? entry.label : '???'}</h3>

      {entry.desbloqueado ? (
        <>
          <p className="game-bestiary-detail__hp">
            <Zap size={13} aria-hidden /> {entry.max_hp.toLocaleString('pt-BR')} HP
          </p>
          <BestiaryDropList drops={entry.drops} />
        </>
      ) : (
        <p className="game-bestiary-detail__locked-hint">Derrote na Exploração para revelar.</p>
      )}
    </motion.div>
  );
}

export function BestiaryModal({ open, onClose, layer = 'default' }: Props) {
  const [data, setData] = useState<BestiaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getBestiary());
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar o bestiário.'), {
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
    if (!open) return;
    setSelectedEntryId(null);
  }, [open]);

  useEffect(() => {
    if (!activeCategoryId && data?.categorias.length) {
      setActiveCategoryId(data.categorias[0]!.id);
    }
  }, [activeCategoryId, data]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedEntryId) {
        setSelectedEntryId(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, selectedEntryId]);

  const categories = useMemo(() => data?.categorias ?? [], [data]);
  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? categories[0],
    [categories, activeCategoryId],
  );
  const flatEntries = useMemo(
    () => categories.flatMap((category) => category.entries.map((entry) => ({ entry, categoryId: category.id }))),
    [categories],
  );
  const selectedEntry = useMemo(
    () => (selectedEntryId ? (flatEntries.find((e) => e.entry.id === selectedEntryId) ?? null) : null),
    [flatEntries, selectedEntryId],
  );

  if (!open) return null;

  const unlockedCount = data?.desbloqueados.length ?? 0;
  const total = data?.total_inimigos ?? 0;

  return createPortal(
    <div
      className={`game-bestiary-fs${layer === 'modal' ? ' game-bestiary-fs--modal' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bestiary-title"
    >
      <header className="game-bestiary-fs__head">
        <button
          type="button"
          className="game-bestiary-fs__close"
          onClick={selectedEntry ? () => setSelectedEntryId(null) : onClose}
          aria-label={selectedEntry ? 'Voltar' : 'Fechar bestiário'}
        >
          {selectedEntry ? <ArrowLeft size={20} /> : <X size={20} />}
        </button>
        <div className="game-bestiary-fs__title-group">
          <BookOpen size={18} className="game-bestiary-fs__title-icon" aria-hidden />
          <h2 id="bestiary-title" className="game-bestiary-fs__title">
            Bestiário
          </h2>
        </div>
        <div className="game-bestiary-fs__progress">
          <span className="game-bestiary-fs__progress-count tabular-nums">
            {unlockedCount}/{total}
          </span>
          {data && (
            <span className="game-bestiary-fs__bonus-chip">
              <Sparkles size={11} aria-hidden /> +{data.bonus_cap_diario} XP/dia
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <p className="game-loader">Carregando bestiário...</p>
      ) : (
        <div className="game-bestiary-fs__body">
          <AnimatePresence mode="wait">
            {selectedEntry ? (
              <BestiaryDetail
                key="detail"
                entry={selectedEntry.entry}
                categoryId={selectedEntry.categoryId}
                onBack={() => setSelectedEntryId(null)}
              />
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <nav className="game-bestiary-fs__tabs" aria-label="Categorias do bestiário">
                  {categories.map((category) => {
                    const unlockedInCat = category.entries.filter((e) => e.desbloqueado).length;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={[
                          'game-bestiary-fs__tab',
                          category.id === activeCategory?.id ? 'game-bestiary-fs__tab--active' : '',
                          category.id === 'golden' ? 'game-bestiary-fs__tab--golden' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setActiveCategoryId(category.id)}
                      >
                        {category.label}
                        <span className="game-bestiary-fs__tab-count tabular-nums">
                          {unlockedInCat}/{category.entries.length}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                {activeCategory && (
                  <div className="game-bestiary-fs__grid">
                    {activeCategory.entries.map((entry) => (
                      <BestiaryTile
                        key={entry.id}
                        entry={entry}
                        categoryId={activeCategory.id}
                        onSelect={setSelectedEntryId}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>,
    document.body,
  );
}
