import { useNavigate } from 'react-router-dom';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { ReminderCenter } from '@/components/activities/ReminderCenter';

export function RemindersPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 pb-24">
      <GamePageHeader
        eyebrow="Alertas do seu jeito"
        title="Notificações"
        onBack={() => navigate('/atividades')}
        backIcon="x"
        backAlign="right"
      />
      <ReminderCenter />
    </div>
  );
}
