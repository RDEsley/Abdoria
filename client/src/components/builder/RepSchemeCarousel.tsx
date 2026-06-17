import { Plus, X } from 'lucide-react';
import { SwipeScroll } from '@/components/ui/SwipeScroll';
import type { StoredRepScheme } from '@/types';
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
  if (schemes.length === 0) {
    return (
      <div className="game-scheme-empty">
        <p className="game-scheme-empty__title">Nenhum esquema salvo</p>
        <p className="game-scheme-empty__text">
          Esquemas definem repetições × séries para todos os exercícios de uma vez. Comece criando o seu — sugerimos
          12 × 3 para {nivelLabel}.
        </p>
        <button type="button" className="game-scheme-create-card game-scheme-create-card--solo" onClick={onCreateClick}>
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
          <div key={scheme.id} className={`game-scheme-card ${active ? 'game-scheme-card--active' : ''}`} role="listitem">
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
            <button type="button" className="game-scheme-card__body" onClick={() => onSelect(scheme)}>
              <span className="game-scheme-card__label">{scheme.label}</span>
              <span className="game-scheme-card__hint">{scheme.descricao}</span>
              {active && <span className="game-scheme-card__badge">Em uso</span>}
            </button>
          </div>
        );
      })}

      <button type="button" className="game-scheme-create-card" onClick={onCreateClick}>
        <Plus size={22} />
        <span>Criar um</span>
      </button>
    </SwipeScroll>
  );
}