import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TERMS_TEXT } from './terms-content';

interface Props {
  open: boolean;
  onAccept?: () => void;
  onClose?: () => void;
  requireAccept?: boolean;
}

export function TermsModal({ open, onAccept, onClose, requireAccept }: Props) {
  const [podeRolar, setPodeRolar] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const checarScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    setPodeRolar(el.scrollHeight - el.scrollTop - el.clientHeight > 24);
  };

  useEffect(() => {
    if (!open) return;
    // Roda depois do primeiro paint, quando o conteúdo já tem altura real.
    const id = requestAnimationFrame(checarScroll);
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div className="glass-panel-strong terms-modal w-full max-w-lg rounded-2xl p-6">
        <h2 className="shrink-0 text-xl font-extrabold text-stone-900">Termos e Condições</h2>

        <div className="terms-modal__scroll-wrap">
          <div className="terms-modal__body" ref={bodyRef} onScroll={checarScroll}>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-600">
              {TERMS_TEXT}
            </pre>
          </div>
          {podeRolar && (
            <div className="terms-modal__fade" aria-hidden>
              <span className="terms-modal__hint">
                <ChevronDown size={13} /> Role para ver mais
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-3">
          {requireAccept ? (
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 cursor-pointer rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
            >
              Aceito os termos
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-xl border border-stone-300 py-3 font-bold text-stone-700 hover:bg-stone-50"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
