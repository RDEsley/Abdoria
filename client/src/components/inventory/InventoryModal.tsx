import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, ShieldCheck, X } from 'lucide-react';
import { FrozenStreakIcon } from '@/lib/item-icons';
import { getInventory, updateMe } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useApp } from '@/hooks/useApp';
import { FROZEN_STREAK_LABEL, formatFrozenStreakDescription } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  layer?: 'default' | 'modal';
}

export function InventoryModal({ open, onClose, layer = 'default' }: Props) {
  const { user, applyUser, stats } = useApp();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inventory = await getInventory();
      setCount(inventory.frozen_streak);
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível carregar o inventário.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setCount(stats?.frozen_streak_count ?? 0);
    void load();
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [load, open, stats?.frozen_streak_count]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const autoUse = user?.preferencias?.frozen_streak_auto_usar ?? true;
  const toggleAutoUse = async () => {
    if (!user || saving) return;
    const next = !autoUse;
    setSaving(true);
    try {
      const updated = await updateMe({
        preferencias: { ...user.preferencias, frozen_streak_auto_usar: next },
      });
      applyUser(updated);
      showGameToast(next ? 'Proteção automática ativada.' : 'Proteção automática desativada.', {
        variant: 'success',
      });
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível salvar a preferência.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className={`fixed inset-0 flex items-end justify-center bg-stone-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4 ${layer === 'modal' ? 'z-[180]' : 'z-[120]'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="presentation"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <motion.section
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-[2rem]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-title"
        >
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                <Backpack size={22} aria-hidden />
              </span>
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-stone-400">
                  Sua proteção
                </p>
                <h2 id="inventory-title" className="text-xl font-black text-stone-900">
                  Inventário
                </h2>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition active:scale-95"
              aria-label="Fechar inventário"
            >
              <X size={21} aria-hidden />
            </button>
          </header>

          <div className="mt-6 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                <FrozenStreakIcon className="h-10 w-10" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-stone-900">{FROZEN_STREAK_LABEL}</h3>
                  <span className="rounded-full bg-sky-600 px-3 py-1 text-sm font-black text-white">
                    {loading ? '…' : count}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-stone-500">
                  {formatFrozenStreakDescription()}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void toggleAutoUse()}
            disabled={saving}
            className="mt-4 flex min-h-14 w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 text-left transition active:scale-[0.99] disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <ShieldCheck className="text-sky-600" size={21} aria-hidden />
              <span>
                <strong className="block text-sm text-stone-900">Uso automático</strong>
                <small className="text-xs font-semibold text-stone-500">
                  Protege sua sequência sem etapas extras
                </small>
              </span>
            </span>
            <span
              className={`relative h-7 w-12 rounded-full transition ${autoUse ? 'bg-sky-600' : 'bg-stone-300'}`}
              aria-hidden
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${autoUse ? 'left-6' : 'left-1'}`}
              />
            </span>
          </button>
        </motion.section>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
