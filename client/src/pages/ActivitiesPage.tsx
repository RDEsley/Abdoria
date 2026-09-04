import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useActivitiesData } from '@/features/activities/useActivitiesData';
import { TodayTab } from '@/features/activities/TodayTab';
import { RoutinesTab } from '@/features/activities/RoutinesTab';
import { MissionsTab } from '@/features/activities/MissionsTab';
import { usePageTab } from '@/hooks/usePageTab';
import { useClaimableQuestCount } from '@/hooks/useClaimableQuests';
import { playTabSwitch } from '@/lib/sounds';

const TABS = ['hoje', 'rotinas', 'missoes'] as const;
type Tab = (typeof TABS)[number];

export function ActivitiesPage() {
  const data = useActivitiesData();
  const [tab, setTab] = usePageTab<Tab>(TABS, 'hoje', { insights: 'missoes' });
  const claimableQuests = useClaimableQuestCount(data.logs.length);

  if (data.loading) return <PageLoader />;

  return (
    <div className="activities-page flex flex-col gap-4 pb-24">
      <header className="flex items-start justify-between gap-3">
        <GamePageHeader eyebrow="Rotina no seu ritmo" title="Atividades" />
        <Link
          to="/lembretes"
          className="activities-reminder-cta"
          aria-label="Criar lembrete personalizado"
        >
          <Bell size={16} aria-hidden />
          <span>Criar lembrete</span>
        </Link>
      </header>

      <div className="flex gap-2">
        {(
          [
            ['hoje', 'Hoje'],
            ['rotinas', 'Rotinas'],
            ['missoes', 'Missões'],
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
            {id === 'missoes' && claimableQuests > 0 && (
              <span
                className="game-tab__badge"
                aria-label={`${claimableQuests} missões para coletar`}
              >
                {claimableQuests}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'hoje' && <TodayTab data={data} />}
      {tab === 'rotinas' && <RoutinesTab data={data} />}
      {tab === 'missoes' && <MissionsTab data={data} />}
    </div>
  );
}
