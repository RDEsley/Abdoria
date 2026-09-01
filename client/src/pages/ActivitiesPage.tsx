import { lazy, Suspense } from 'react';
import { CalendarCheck2, NotebookPen } from 'lucide-react';
import { AtividadesCard } from '@/components/dashboard/AtividadesCard';
import { BlocoNotasCard } from '@/components/dashboard/BlocoNotasCard';
import { ReminderCenter } from '@/components/activities/ReminderCenter';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';

const ActivityCalendar = lazy(() =>
  import('@/components/dashboard/ActivityCalendar').then((module) => ({
    default: module.ActivityCalendar,
  })),
);

/** Área dedicada à organização pessoal e ao histórico diário. */
export function ActivitiesPage() {
  return (
    <div className="activities-page flex flex-col gap-5 pb-24">
      <GamePageHeader eyebrow="Pequenos passos, grandes sequências" title="Sua jornada diária" />

      <section className="activities-page__routine" aria-label="Rotina de hoje">
        <AtividadesCard />
      </section>

      <section
        className="app-surface activities-page__notes"
        aria-labelledby="activity-notes-title"
      >
        <h2 id="activity-notes-title" className="game-section-title flex items-center gap-2">
          <NotebookPen size={16} aria-hidden /> Bloco de Notas
        </h2>
        <p className="activities-page__section-copy">
          Anotações rápidas, separadas dos seus alertas.
        </p>
        <BlocoNotasCard />
      </section>

      <ReminderCenter />

      <section className="glass-card activities-page__calendar p-4">
        <h2 className="game-section-title flex items-center gap-2">
          <CalendarCheck2 size={15} aria-hidden /> Mapa de atividades
        </h2>
        <Suspense fallback={<PageLoader />}>
          <ActivityCalendar />
        </Suspense>
      </section>
    </div>
  );
}
