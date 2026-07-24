import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

/** Troca rápida do banner do card de Perfil (aberta pelo lápis do hero). */
export function BannerPickerModal({ open, onClose, onChanged }: Props) {
  const [banners, setBanners] = useState<ShopCatalogItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBanners(null);
    getShop()
      .then((data) => {
        if (!cancelled) setBanners(data.banners ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          showGameToast(getErrorMessage(err, 'Não foi possível carregar os banners.'), {
            variant: 'error',
          });
        }
      });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleEquip = async (item: ShopCatalogItem) => {
    if (busyId || item.equipada || !item.desbloqueada) return;
    setBusyId(item.id);
    try {
      await equipShopItem('banner', item.id);
      playEquip();
      await onChanged();
      const data = await getShop();
      setBanners(data.banners ?? []);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível trocar o banner.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  return createPortal(
    <div className="game-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="game-modal profile-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="profile-edit-modal__head">
          <h2 id="banner-picker-title">Banner do perfil</h2>
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
          {!banners ? (
            <p className="game-loader">Carregando banners...</p>
          ) : (
            <div className="profile-banner-grid">
              {banners.map((item) => {
                const key = item.id.replace('fundo_', '');
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`profile-banner-option${item.equipada ? ' profile-banner-option--active' : ''}`}
                    disabled={busyId === item.id || !item.desbloqueada}
                    title={item.desbloqueada ? item.nome : `${item.nome} — ${item.unlock_label}`}
                    onClick={() => void handleEquip(item)}
                  >
                    <span
                      className={`profile-banner-option__swatch game-card-banner--${key}`}
                      aria-hidden
                    >
                      {item.equipada && (
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
          )}
        </div>

        <footer className="profile-edit-modal__footer">
          <GameButton variant="secondary" className="!w-auto px-4" onClick={onClose}>
            Fechar
          </GameButton>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
