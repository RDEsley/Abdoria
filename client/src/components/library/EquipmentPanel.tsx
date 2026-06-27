import { Dumbbell, ExternalLink } from 'lucide-react';
import { useEquipment } from '@/hooks/useEquipment';
import type { EquipmentId } from '@/types';

interface Props {
  onEquipmentChange?: () => void;
}

export function EquipmentPanel({ onEquipmentChange }: Props) {
  const { catalog, isOwned, setEquipmentOwned } = useEquipment(onEquipmentChange);

  const handleToggle = (id: EquipmentId, checked: boolean) => {
    void setEquipmentOwned(id, checked);
  };

  return (
    <section className="library-equipment" aria-labelledby="library-equipment-title">
      <div className="library-equipment__header">
        <span className="library-equipment__icon" aria-hidden>
          <Dumbbell size={18} />
        </span>
        <div>
          <h2 id="library-equipment-title" className="library-equipment__title">
            Meus Equipamentos
          </h2>
          <p className="library-equipment__subtitle">
            Marque o que você possui para desbloquear exercícios extras na biblioteca e nas recomendações.
          </p>
        </div>
      </div>

      <ul className="library-equipment__list">
        {catalog.map((item) => {
          const owned = isOwned(item.id);
          const inputId = `equipment-${item.id}`;
          return (
            <li key={item.id} className={`library-equipment__item${owned ? ' library-equipment__item--owned' : ''}`}>
              <label htmlFor={inputId} className="library-equipment__label">
                <input
                  id={inputId}
                  type="checkbox"
                  className="library-equipment__checkbox"
                  checked={owned}
                  onChange={(e) => handleToggle(item.id, e.target.checked)}
                />
                <span className="library-equipment__check-ui" aria-hidden />
                <span className="library-equipment__text">
                  <strong>{item.nome}</strong>
                  <span className="library-equipment__question">Você possui este equipamento?</span>
                  <span className="library-equipment__desc">{item.descricao}</span>
                  <span className="library-equipment__count">
                    {item.exerciseSlugs.length} exercício(s) · {owned ? 'Desbloqueados' : 'Bloqueados'}
                  </span>
                </span>
              </label>
              {item.purchaseUrl && (
                <a
                  href={item.purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="library-equipment__buy"
                >
                  <ExternalLink size={13} aria-hidden />
                  Comprar no Mercado Livre
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
