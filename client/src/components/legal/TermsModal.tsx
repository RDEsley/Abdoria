import { TERMS_TEXT } from './terms-content';

interface Props {
  open: boolean;
  onAccept?: () => void;
  onClose?: () => void;
  requireAccept?: boolean;
}

export function TermsModal({ open, onAccept, onClose, requireAccept }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div className="glass-panel-strong game-scroll-y max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6">
        <h2 className="text-xl font-extrabold text-stone-900">Termos e Condições</h2>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-600">{TERMS_TEXT}</pre>
        <div className="mt-6 flex gap-3">
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
