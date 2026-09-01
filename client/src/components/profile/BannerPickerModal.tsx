import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock, X } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { playEquip } from '@/lib/sounds';
import { equipShopItem, getShop } from '@/lib/api';
import type { ShopCatalogItem } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Recarrega usuário/app depois de trocar o banner. */
  onChanged: () => Promise<void>;
}

/** Troca do banner do card de Perfil (aberta pelo lápis do hero). */
export function BannerPickerModal({ open, onClose, onChanged }: Props) {
  const [banners, setBanners] = useState<ShopCatalogItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Busca da lista separada do listener de Escape — sem isso, os dois
  // dividiam um único efeito com `onClose` na dependência, e como `onClose`
  // é recriado a cada render do componente pai (arrow function inline), o
  // efeito rodava de novo em QUALQUER re-render do pai enquanto o modal
  // estava aberto: `setBanners(null)` disparava e a tela "piscava" pro
  // loading e recarregava do zero, mesmo sem o usuário ter feito nada.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBanners(null);
    setSelectedId(null);
    getShop()
      .then((data) => {
        if (cancelled) return;
        const list = data.banners ?? [];
        setBanners(list);
        setSelectedId(list.find((b) => b.equipada)?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          showGameToast(getErrorMessage(err, 'Não foi possível carregar os banners.'), {
            variant: 'error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (item: ShopCatalogItem) => {
    if (saving) return;
    if (!item.desbloqueada) {
      showGameToast(item.unlock_label, { variant: 'info' });
      return;
    }
    setSelectedId(item.id);
  };

  const currentEquippedId = banners?.find((b) => b.equipada)?.id ?? null;
  const anythingChanged = selectedId != null && selectedId !== currentEquippedId;

  const handleSave = async () => {
    if (!anythingChanged || saving || !selectedId) return;
    setSaving(true);
    try {
      await equipShopItem('banner', selectedId);
      playEquip();
      await onChanged();
      onClose();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível trocar o banner.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Desbloqueados primeiro, bloqueados depois — mantém a ordem do catálogo
  // dentro de cada grupo.
  const orderedBanners = banners
    ? [...banners].sort((a, b) => Number(b.desbloqueada) - Number(a.desbloqueada))
    : null;

  const selectedItem = orderedBanners?.find((item) => item.id === selectedId) ?? null;
  const selectedKey = selectedItem?.id.replace('fundo_', '') ?? null;

  return createPortal(
    <div className="game-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="game-modal profile-edit-modal profile-banner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="profile-edit-modal__head">
          <div>
            <p className="profile-edit-modal__eyebrow">Plano de fundo</p>
            <h2 id="banner-picker-title">Banner do perfil</h2>
            <p className="profile-edit-modal__subtitle">Veja o banner inteiro antes de escolher.</p>
          </div>
          <button
            type="button"
            className="profile-edit-modal__close"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="profile-edit-modal__body">
          {!orderedBanners ? (
            <div
              className="flex items-center justify-center py-10"
              role="status"
              aria-label="Carregando banners"
            >
              <span className="profile-banner-picker__spinner" />
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait" initial={false}>
                {selectedItem && (
                  <motion.div
                    key={selectedItem.id}
                    className={`profile-banner-preview game-card-banner--${selectedKey}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <span className="profile-banner-preview__name">{selectedItem.nome}</span>
                    {!selectedItem.desbloqueada && (
                      <span className="profile-banner-preview__lock">
                        <Lock size={11} aria-hidden /> {selectedItem.unlock_label}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="profile-banner-grid">
                {orderedBanners.map((item) => {
                  const key = item.id.replace('fundo_', '');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`profile-banner-option${item.id === selectedId ? ' profile-banner-option--active' : ''}${!item.desbloqueada ? ' profile-banner-option--locked' : ''}`}
                      disabled={saving}
                      title={item.desbloqueada ? item.nome : `${item.nome} — ${item.unlock_label}`}
                      onClick={() => handleSelect(item)}
                    >
                      <span
                        className={`profile-banner-option__swatch game-card-banner--${key}`}
                        aria-hidden
                      >
                        {item.id === selectedId && (
                          <span className="profile-banner-option__badge">
                            <Check size={12} aria-hidden />
                          </span>
                        )}
                        {!item.desbloqueada && (
                          <span className="profile-banner-option__lock" aria-hidden>
                            <Lock size={12} />
                          </span>
                        )}
                      </span>
                      <span className="profile-banner-option__name">{item.nome}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <footer className="profile-edit-modal__footer">
          <GameButton
            className="w-full"
            disabled={!anythingChanged || saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </GameButton>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
