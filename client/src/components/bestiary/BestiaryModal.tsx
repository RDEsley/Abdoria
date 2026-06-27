import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { getBestiary, type BestiaryResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { AFK_ENEMIES, XP_DAILY_CAP_PER_BESTIARY } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

function BestiaryThumb({ enemyId, unlocked }: { enemyId: string; unlocked: boolean }) {
  if (!unlocked) {
    return (
      <div className="game-bestiary-thumb game-bestiary-thumb--locked" aria-hidden>
        <span className="game-bestiary-thumb__silhouette" />
        <Lock size={14} className="game-bestiary-thumb__lock" />
      </div>
    );
  }

  const def = AFK_ENEMIES[enemyId as keyof typeof AFK_ENEMIES];
  return (
    <div
      className={`game-bestiary-thumb game-bestiary-thumb--unlocked game-afk-enemy game-afk-enemy--${enemyId}${def?.tier === 'boss' ? ' game-afk-enemy--boss' : ''}${def?.tier === 'elite' ? ' game-afk-enemy--elite' : ''}`}
      aria-hidden
    >
      <span className="game-bestiary-thumb__blob" />
    </div>
  );
}

export function BestiaryModal({ open, onClose }: Props) {
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

  return createPortal(
    <div className="game-modal-overlay" onClick={onClose} role="presentation">
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
          <h2 id="bestiary-title" className="game-modal__title">
            Bestiário
          </h2>
          <p className="game-modal__text">
            {unlockedCount}/{total} descobertos · +{XP_DAILY_CAP_PER_BESTIARY} teto diário por inimigo novo
            {data ? ` · bônus atual: +${data.bonus_cap_diario} XP/dia` : ''}
          </p>
        </header>

        {loading ? (
          <p className="game-loader">Carregando bestiário...</p>
        ) : (
          <div className="game-bestiary-scroll">
            {data?.categorias.map((category) => (
              <section key={category.id} className="game-bestiary-section">
                <h3 className="game-bestiary-section__title">{category.label}</h3>
                <div className="game-bestiary-grid">
                  {category.entries.map((entry) => (
                    <article
                      key={entry.id}
                      className={`game-bestiary-card${entry.desbloqueado ? ' game-bestiary-card--unlocked' : ' game-bestiary-card--locked'}`}
                    >
                      <BestiaryThumb enemyId={entry.id} unlocked={entry.desbloqueado} />
                      <div className="game-bestiary-card__meta">
                        <h4>{entry.desbloqueado ? entry.label : '???'}</h4>
                        {entry.desbloqueado ? (
                          <p>
                            {entry.tier === 'boss' ? 'Chefe' : entry.tier === 'elite' ? 'Elite' : 'Comum'} · {entry.max_hp} HP
                          </p>
                        ) : (
                          <p>Derrote na Exploração AFK para revelar.</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
