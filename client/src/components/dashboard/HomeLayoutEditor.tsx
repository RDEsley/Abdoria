import { ChevronDown, ChevronUp, Eye, EyeOff, LockKeyhole, X } from 'lucide-react';
import {
  DEFAULT_HOME_OPTIONAL_SECTIONS,
  HOME_OPTIONAL_SECTION_LABELS,
  type HomeOptionalSectionId,
} from '@shared/home-layout';

interface Props {
  order: HomeOptionalSectionId[];
  hidden: HomeOptionalSectionId[];
  onOrderChange: (order: HomeOptionalSectionId[]) => void;
  onHiddenChange: (hidden: HomeOptionalSectionId[]) => void;
  onClose: () => void;
}

export function HomeLayoutEditor({ order, hidden, onOrderChange, onHiddenChange, onClose }: Props) {
  const move = (id: HomeOptionalSectionId, direction: -1 | 1) => {
    if (id === 'achievements') return;
    const editable = order.filter((item) => item !== 'achievements');
    const from = editable.indexOf(id);
    const to = from + direction;
    if (to < 0 || to >= editable.length) return;
    [editable[from], editable[to]] = [editable[to], editable[from]];
    onOrderChange([...editable, 'achievements']);
  };

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-stone-900">Organizar Início</h2>
          <p className="mt-1 text-xs font-semibold text-stone-600">
            Altere a ordem ou esconda blocos opcionais.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-600"
          aria-label="Fechar edição"
        >
          <X size={17} />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {order.map((id, index) => {
          const isHidden = hidden.includes(id);
          const lockedLast = id === 'achievements';
          return (
            <div
              key={id}
              className="flex min-h-12 items-center gap-2 rounded-2xl border border-white bg-white/90 px-3 shadow-sm"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-stone-700">
                {HOME_OPTIONAL_SECTION_LABELS[id]}
              </span>
              {lockedLast && (
                <span title="Conquistas fica sempre por último">
                  <LockKeyhole size={14} className="text-stone-400" />
                </span>
              )}{' '}
              {!lockedLast && (
                <>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(id, -1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 disabled:opacity-30"
                    aria-label={`Mover ${HOME_OPTIONAL_SECTION_LABELS[id]} para cima`}
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={index >= order.length - 2}
                    onClick={() => move(id, 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 disabled:opacity-30"
                    aria-label={`Mover ${HOME_OPTIONAL_SECTION_LABELS[id]} para baixo`}
                  >
                    <ChevronDown size={15} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  onHiddenChange(isHidden ? hidden.filter((item) => item !== id) : [...hidden, id])
                }
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${isHidden ? 'bg-stone-200 text-stone-500' : 'bg-emerald-100 text-emerald-700'}`}
                aria-label={`${isHidden ? 'Mostrar' : 'Ocultar'} ${HOME_OPTIONAL_SECTION_LABELS[id]}`}
              >
                {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          );
        })}
      </div>
      {DEFAULT_HOME_OPTIONAL_SECTIONS.every((id) => hidden.includes(id)) && (
        <p className="mt-3 text-center text-xs font-bold text-stone-500">
          Você pode reativar qualquer seção pelo ícone de visibilidade.
        </p>
      )}
      <div className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-[0.68rem] font-semibold leading-relaxed text-stone-500">
        Sua semana, recordes, Nível &amp; XP e Mapa da campanha permanecem fixos.
      </div>
    </section>
  );
}
