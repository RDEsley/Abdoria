import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Dumbbell, ExternalLink } from 'lucide-react';
import { useEquipment } from '@/hooks/useEquipment';
import type { EquipmentId } from '@/types';

interface Props {
  onEquipmentChange?: () => void;
}

export function EquipmentPanel({ onEquipmentChange }: Props) {
  const { catalog, isOwned, setEquipmentOwned } = useEquipment(onEquipmentChange);
  const [open, setOpen] = useState(false);

  const ownedCount = catalog.filter((item) => isOwned(item.id)).length;

  const handleToggle = (id: EquipmentId, checked: boolean) => {
    void setEquipmentOwned(id, checked);
  };

  return (
    <section className="library-equipment" aria-labelledby="library-equipment-title">
      <button
        type="button"
        className="library-equipment__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="library-equipment__icon" aria-hidden>
          <Dumbbell size={16} />
        </span>
        <span className="library-equipment__heading">
          <span id="library-equipment-title" className="library-equipment__title">
            Meus equipamentos
          </span>
          <span className="library-equipment__summary">
            {ownedCount}/{catalog.length} ativos
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`library-equipment__chevron${open ? ' library-equipment__chevron--open' : ''}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="library-equipment__drawer"
          >
            <ul className="library-equipment__list">
              {catalog.map((item) => {
                const owned = isOwned(item.id);
                return (
                  <li
                    key={item.id}
                    className={`library-equipment__item${owned ? ' library-equipment__item--owned' : ''}`}
                  >
                    <div className="library-equipment__text">
                      <span className="library-equipment__name">
                        {item.nome}
                        {item.purchaseUrl && !owned && (
                          <a
                            href={item.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="library-equipment__buy"
                            aria-label={`Comprar ${item.nome}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={11} aria-hidden />
                            Comprar
                          </a>
                        )}
                      </span>
                      <span className="library-equipment__count">
                        {item.informationalOnly
                          ? `${item.compatibleExerciseSlugs?.length ?? 0} flexões compatíveis · opcional`
                          : `${item.exerciseSlugs.length} exercício${item.exerciseSlugs.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={owned}
                      aria-label={`${item.nome}: ${owned ? 'ativo' : 'inativo'}`}
                      className={`library-equipment__switch${owned ? ' library-equipment__switch--on' : ''}`}
                      onClick={() => handleToggle(item.id, !owned)}
                    >
                      <span className="library-equipment__switch-thumb" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="library-equipment__hint">
              Ative o que você tem. A prancha 9 em 1 é opcional e não bloqueia flexões.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
