import { lazy, Suspense } from 'react';
import { CalendarCheck2 } from 'lucide-react';
import { AtividadesCard } from '@/components/dashboard/AtividadesCard';
import { ReminderCenter } from '@/components/activities/ReminderCenter';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';

const ActivityCalendar = lazy(() =>
  import('@/components/dashboard/ActivityCalendar').then((module) => ({
    default: module.ActivityCalendar,
  })),
);

/** Área dedicada às atividades, ao mapa da campanha e ao histórico diário. */
export function ActivitiesPage() {
  return (
    <div className="flex flex-col gap-5 pb-24">
      <GamePageHeader eyebrow="Sua rotina" title="Atividades" />

      <AtividadesCard />

      <ReminderCenter />

      <section className="glass-card p-4">
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
