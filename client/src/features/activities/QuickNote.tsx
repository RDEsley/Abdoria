import { useMemo, useState } from 'react';
import { ChevronDown, NotebookPen } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BlocoNotasCard } from '@/components/dashboard/BlocoNotasCard';
import { usePreferencesPersist } from '@/hooks/usePreferencesPersist';
import { ordenarNotas, resolveBlocoNotas } from '@shared/bloco-notas';

/**
 * Notas rápidas no topo de Hoje — recolhível para não empurrar as Activities.
 * Badge = pendentes (não feitas). Sessão começa recolhida.
 */
export function QuickNote() {
  const { user } = usePreferencesPersist();
  const reduceMotion = Boolean(useReducedMotion());
  const [open, setOpen] = useState(false);

  const pendingCount = useMemo(() => {
    const notas = ordenarNotas(resolveBlocoNotas(user?.preferencias));
    return notas.filter((nota) => !nota.feita).length;
  }, [user?.preferencias]);

  return (
    <section className="quick-notes-shell" aria-labelledby="quick-note-title">
      <button
        type="button"
        className={`quick-notes-toggle${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls="quick-notes-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="quick-notes-toggle__lead">
          <NotebookPen size={16} aria-hidden />
          <span id="quick-note-title">Notas rápidas</span>
          {!open && pendingCount > 0 ? (
            <span className="quick-notes-toggle__badge" aria-label={`${pendingCount} pendentes`}>
              {pendingCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          className={`quick-notes-toggle__chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="quick-notes-panel"
            className="quick-notes-panel"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            <div className="quick-notes-panel__inner">
              <p className="mb-3 text-xs font-semibold text-stone-500">
                Separada da rotina — um lugar para o que não cabe numa atividade.
              </p>
              <BlocoNotasCard />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
