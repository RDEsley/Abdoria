import { Plus, Timer, TriangleAlert, X } from 'lucide-react';
import { SwipeScroll } from '@/components/ui/SwipeScroll';
import type { StoredRepScheme } from '@/types';

/** Máximo de esquemas salvos por nível — mantém o carrossel e as 3+3 pills
    por exercício em uma grade previsível. */
export const MAX_REP_SCHEMES = 6;

interface Props {
  schemes: StoredRepScheme[];
  selectedId: string | null;
  nivelLabel: string;
  onSelect: (scheme: StoredRepScheme) => void;
  onDelete: (schemeId: string) => void;
  onCreateClick: () => void;
}

export function RepSchemeCarousel({
  schemes,
  selectedId,
  nivelLabel,
  onSelect,
  onDelete,
  onCreateClick,
}: Props) {
  const atLimit = schemes.length >= MAX_REP_SCHEMES;
  if (schemes.length === 0) {
    return (
      <div className="game-scheme-empty">
        <p className="game-scheme-empty__title">Nenhum esquema salvo</p>
        <p className="game-scheme-empty__text">
          Esquemas definem repetições × séries para todos os exercícios de uma vez. Comece criando o
          seu — sugerimos 12 × 3 para {nivelLabel}.
        </p>
        <button
          type="button"
          className="game-scheme-create-card game-scheme-create-card--solo"
          onClick={onCreateClick}
        >
          <Plus size={22} />
          <span>Criar um esquema</span>
        </button>
      </div>
    );
  }

  return (
    <SwipeScroll
      className="game-scheme-carousel"
      role="list"
      aria-label="Esquemas de repetições e séries"
      prevLabel="Ver esquemas anteriores"
      nextLabel="Ver mais esquemas"
    >
      {schemes.map((scheme) => {
        const active = selectedId === scheme.id;
        return (
          <div
            key={scheme.id}
            className={`game-scheme-card ${active ? 'game-scheme-card--active' : ''}`}
            role="listitem"
          >
            <button
              type="button"
              className="game-scheme-card__delete"
              aria-label={`Excluir esquema ${scheme.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(scheme.id);
              }}
            >
              <X size={14} />
            </button>
            <button
              type="button"
              className="game-scheme-card__body"
              onClick={() => onSelect(scheme)}
            >
              <span className="game-scheme-card__values">
                <span className="game-scheme-card__label">{scheme.label}</span>
                {scheme.tempo_seg != null && (
                  <span
                    className="game-scheme-card__tempo"
                    title="Tempo nos exercícios de segurar"
                  >
                    <Timer size={11} aria-hidden /> {scheme.tempo_seg}s
                  </span>
                )}
              </span>
              <span className="game-scheme-card__hint">{scheme.descricao}</span>
              {active && <span className="game-scheme-card__badge">Em uso</span>}
            </button>
          </div>
        );
      })}

      {atLimit ? (
        <div className="game-scheme-limit-card" role="note" aria-live="polite">
          <TriangleAlert size={18} aria-hidden />
          <span>Máx. de {MAX_REP_SCHEMES} esquemas — remova um pra criar outro</span>
        </div>
      ) : (
        <button type="button" className="game-scheme-create-card" onClick={onCreateClick}>
          <Plus size={22} />
          <span>Criar um</span>
        </button>
      )}
    </SwipeScroll>
  );
}
