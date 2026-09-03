import { NotebookPen } from 'lucide-react';
import { BlocoNotasCard } from '@/components/dashboard/BlocoNotasCard';

export function QuickNote() {
  return (
    <section className="app-surface p-4" aria-labelledby="quick-note-title">
      <h2 id="quick-note-title" className="game-section-title flex items-center gap-2">
        <NotebookPen size={16} aria-hidden /> Nota rápida
      </h2>
      <p className="mb-3 text-xs font-semibold text-stone-500">
        Separada da rotina — um lugar para o que não cabe numa atividade.
      </p>
      <BlocoNotasCard />
    </section>
  );
}
