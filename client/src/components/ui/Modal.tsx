import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** `wide` usa `.game-modal--wide`; `bare` não aplica nenhuma classe de painel (o filho controla o próprio layout). */
  variant?: 'default' | 'wide' | 'bare';
  overlayClassName?: string;
  panelClassName?: string;
  labelledBy?: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  /** Desliga fechar por Escape/clique fora — útil durante uma ação em andamento (ex.: compra). */
  disableDismiss?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Primitivo de modal: portal + scroll lock + Escape + trap de foco.
 * Reaproveita as classes visuais `.game-modal-overlay`/`.game-modal` já existentes
 * para não introduzir nenhuma mudança visual nos modais migrados.
 */
export function Modal({
  open,
  onClose,
  children,
  variant = 'default',
  overlayClassName = '',
  panelClassName = '',
  labelledBy,
  describedBy,
  role = 'dialog',
  disableDismiss = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // `onClose`/`disableDismiss` quase sempre chegam como closure nova a cada
  // render do dono do modal (ex.: `onClose={() => setX(null)}`). Se o efeito
  // abaixo dependesse deles, qualquer re-render do pai (inclusive um efeito
  // colateral irrelevante, tipo um `applyUser` em progresso) reexecutava o
  // "roubo de foco" (linha do `.focus()`) e derrubava o teclado numérico
  // do celular no meio da digitação — por isso ficam numa ref, só pra sempre
  // ler a versão mais recente sem disparar o efeito de novo.
  const onCloseRef = useRef(onClose);
  const disableDismissRef = useRef(disableDismiss);
  useEffect(() => {
    onCloseRef.current = onClose;
    disableDismissRef.current = disableDismiss;
  });

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (disableDismissRef.current) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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

  if (!open) return null;

  const panelClass =
    variant === 'bare'
      ? panelClassName
      : `game-modal ${variant === 'wide' ? 'game-modal--wide' : ''} ${panelClassName}`.trim();

  return createPortal(
    // `game-app` no overlay: o portal renderiza fora da árvore do app, e sem
    // essa classe os tokens --game-* não resolvem dentro do modal.
    <div
      className={`game-app game-modal-overlay ${overlayClassName}`.trim()}
      role="presentation"
      onClick={disableDismiss ? undefined : onClose}
    >
      <div
        ref={panelRef}
        className={panelClass}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
