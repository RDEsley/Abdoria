import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Map, Swords } from 'lucide-react';
import { AtividadesCard } from '@/components/dashboard/AtividadesCard';
import { CampaignFeed } from '@/components/dashboard/CampaignFeed';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';

const ActivityCalendar = lazy(() =>
  import('@/components/dashboard/ActivityCalendar').then((module) => ({
    default: module.ActivityCalendar,
  })),
);

/** Centraliza atividades, campanha e a jornada AFK fora da Home. */
export function ExplorationHubPage() {
  return (
    <div className="flex flex-col gap-5 pb-24">
      <GamePageHeader eyebrow="Sua jornada" title="Exploração" />

      <section className="glass-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Compass size={22} aria-hidden />
          </span>
          <div>
            <h2 className="font-extrabold text-stone-900">Continuar exploração</h2>
            <p className="mt-1 text-xs font-semibold text-stone-500">
              Patrulhe regiões, enfrente inimigos e colete suas recompensas.
            </p>
          </div>
        </div>
        <Link to="/exploracao/jornada" className="mt-4 block">
          <GameButton className="flex w-full items-center justify-center gap-2">
            <Swords size={17} aria-hidden /> Abrir jornada
          </GameButton>
        </Link>
      </section>

      <AtividadesCard />

      <section className="glass-card p-4">
        <h2 className="game-section-title flex items-center gap-2">
          <Map size={15} aria-hidden /> Mapa de campanha
        </h2>
        <CampaignFeed />
      </section>

      <section className="glass-card p-4">
        <h2 className="game-section-title">Mapa de atividades</h2>
        <Suspense fallback={<PageLoader />}>
          <ActivityCalendar />
        </Suspense>
      </section>
    </div>
  );
}
