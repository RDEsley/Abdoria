import { useState } from 'react';
import { Bell } from 'lucide-react';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ReminderCenter } from '@/components/activities/ReminderCenter';
import { Modal } from '@/components/ui/Modal';
import { useActivitiesData } from '@/features/activities/useActivitiesData';
import { TodayTab } from '@/features/activities/TodayTab';
import { RoutinesTab } from '@/features/activities/RoutinesTab';
import { InsightsTab } from '@/features/activities/InsightsTab';
import { playTabSwitch } from '@/lib/sounds';

type Tab = 'hoje' | 'rotinas' | 'insights';

export function ActivitiesPage() {
  const data = useActivitiesData();
  const [tab, setTab] = useState<Tab>('hoje');
  const [remindersOpen, setRemindersOpen] = useState(false);

  if (data.loading) return <PageLoader />;

  return (
    <div className="activities-page flex flex-col gap-4 pb-24">
      <header className="flex items-start justify-between gap-3">
        <GamePageHeader eyebrow="Rotina no seu ritmo" title="Atividades" />
        <button
          type="button"
          className="game-icon-btn"
          aria-label="Lembretes livres"
          onClick={() => setRemindersOpen(true)}
        >
          <Bell size={18} />
        </button>
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

      <Modal open={remindersOpen} onClose={() => setRemindersOpen(false)} variant="wide">
        <div className="max-h-[80vh] overflow-y-auto p-3">
          <ReminderCenter />
        </div>
      </Modal>
    </div>
  );
}
