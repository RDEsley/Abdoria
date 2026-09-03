import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset';

interface AuthSheetProps {
  open: boolean;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Bottom sheet no mobile, painel flutuante no desktop. Sem autofocus em input. */
export function AuthSheet({ open, titleId, onClose, children }: AuthSheetProps) {
  const reduceMotion = useReducedMotion();
  const keyboardInset = useVisualViewportInset();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const labelId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.querySelector('.game-modal-overlay')) return;
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="auth-sheet-root"
          style={{ ['--keyboard-inset' as string]: `${keyboardInset}px` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
        >
          <button
            type="button"
            className="auth-sheet__backdrop"
            aria-label="Fechar"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            className="auth-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId || labelId}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { y: '28%', opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '18%', opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.14 }
                : { type: 'spring', stiffness: 380, damping: 34, mass: 0.85 }
            }
          >
            <div className="auth-sheet__handle" aria-hidden />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
