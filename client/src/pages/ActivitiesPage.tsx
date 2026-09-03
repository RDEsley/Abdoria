import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useActivitiesData } from '@/features/activities/useActivitiesData';
import { TodayTab } from '@/features/activities/TodayTab';
import { RoutinesTab } from '@/features/activities/RoutinesTab';
import { InsightsTab } from '@/features/activities/InsightsTab';
import { useStickyTab } from '@/hooks/useStickyTab';
import { playTabSwitch } from '@/lib/sounds';

const TABS = ['hoje', 'rotinas', 'insights'] as const;
type Tab = (typeof TABS)[number];

export function ActivitiesPage() {
  const data = useActivitiesData();
  const [tab, setTab] = useStickyTab<Tab>('evolyn:activities-tab', TABS, 'hoje');

  if (data.loading) return <PageLoader />;

  return (
    <div className="activities-page flex flex-col gap-4 pb-24">
      <header className="flex items-start justify-between gap-3">
        <GamePageHeader eyebrow="Rotina no seu ritmo" title="Atividades" />
        <Link to="/lembretes" className="game-icon-btn" aria-label="Lembretes livres">
          <Bell size={18} />
        </Link>
      </header>

      <div className="flex gap-2">
        {(
          [
            ['hoje', 'Hoje'],
            ['rotinas', 'Rotinas'],
            ['insights', 'Insights'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`game-tab${tab === id ? ' game-tab--active' : ''}`}
            onClick={() => {
              playTabSwitch();
              setTab(id);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'hoje' && <TodayTab data={data} />}
      {tab === 'rotinas' && <RoutinesTab data={data} />}
      {tab === 'insights' && <InsightsTab data={data} />}
    </div>
  );
}
