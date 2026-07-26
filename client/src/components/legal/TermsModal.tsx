import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TERMS_TEXT } from './terms-content';

interface Props {
  open: boolean;
  onAccept?: () => void;
  onClose?: () => void;
  requireAccept?: boolean;
}

/** Margem de segurança (padding do overlay + folga visual) descontada da
    altura da janela ao calcular a altura fixa do card. */
const VIEWPORT_MARGIN_PX = 64;

export function TermsModal({ open, onAccept, onClose, requireAccept }: Props) {
  // Começa travado quando precisa de aceite — evita 1 frame com o botão
  // liberado antes da 1ª checarScroll() confirmar se dá pra rolar mais.
  const [podeRolar, setPodeRolar] = useState(() => Boolean(requireAccept));
  // Altura do card em PIXELS calculada via JS, não `max-height` em CSS — um
  // `max-height` num container flex-column depende do motor de layout tratar
  // o resultado do clamp como "definido" pros filhos com `flex:1`/`height:
  // 100%` resolverem contra ele, e mais de uma rodada mostrou isso falhando
  // na prática (o corpo nunca ficava realmente menor que o conteúdo, então
  // não tinha o que rolar). Um número fixo em px não deixa margem pra essa
  // ambiguidade: os filhos SEMPRE têm uma altura concreta pra calcular contra.
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const checarScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    setPodeRolar(el.scrollHeight - el.scrollTop - el.clientHeight > 24);
  };

  // useLayoutEffect (não useEffect): calcula a altura ANTES do browser pintar
  // a tela, senão o card aparece 1 frame sem altura nenhuma (conteúdo todo
  // solto) antes de "pular" pro tamanho certo.
  useLayoutEffect(() => {
    if (!open) return undefined;

    const atualizarAltura = () => {
      setCardHeight(Math.max(240, window.innerHeight - VIEWPORT_MARGIN_PX));
    };
    atualizarAltura();
    window.addEventListener('resize', atualizarAltura);
    return () => window.removeEventListener('resize', atualizarAltura);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    // Roda depois do primeiro paint, quando o corpo já tem a altura definitiva.
    const id = requestAnimationFrame(checarScroll);
    return () => cancelAnimationFrame(id);
  }, [open, cardHeight]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Altura/scroll em style inline com px fixo (ver cardHeight acima) —
          maior especificidade possível e nenhuma ambiguidade de auto/max-height. */}
      <div
        className="glass-panel-strong w-full max-w-lg rounded-2xl p-6"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          height: cardHeight != null ? `${cardHeight}px` : undefined,
          maxHeight: '85vh',
          overflow: 'hidden',
        }}
      >
        <h2 className="shrink-0 text-xl font-extrabold text-stone-900">Termos e Condições</h2>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className="terms-modal__body h-full overflow-y-auto pr-2"
            ref={bodyRef}
            onScroll={checarScroll}
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-stone-600">
              {TERMS_TEXT}
            </div>
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
              disabled={podeRolar}
              title={podeRolar ? 'Role até o fim para continuar' : undefined}
              className="flex-1 cursor-pointer rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:hover:bg-stone-300"
            >
              {podeRolar ? 'Role até o fim para continuar' : 'Aceito os termos'}
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
