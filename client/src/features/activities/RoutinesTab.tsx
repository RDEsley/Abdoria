import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import type { useActivitiesData } from './useActivitiesData';

export function RoutinesTab({ data }: { data: ReturnType<typeof useActivitiesData> }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-3">
      {data.routines.length === 0 && (
        <p className="text-sm font-bold text-stone-600">
          Uma rotina é só um conjunto de atividades na ordem que você quiser.
        </p>
      )}
      {data.routines.map((routine) => {
        const total = routine.items?.length ?? 0;
        return (
          <button
            key={routine.id}
            type="button"
            className="activity-quick-card"
            onClick={() => navigate(`/rotina/${routine.id}`)}
          >
            <div className="activity-quick-card__body">
              <strong>{routine.name}</strong>
              <small>
                {total} {total === 1 ? 'atividade' : 'atividades'}
              </small>
            </div>
          </button>
        );
      })}
      <GameButton
        variant="secondary"
        className="flex items-center justify-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus size={16} /> Nova rotina
      </GameButton>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="routine-create-title">
        <div className="p-4">
          <h2 id="routine-create-title" className="game-section-title">
            Nova rotina
          </h2>
          <input
            className="game-input mt-2 w-full"
            maxLength={40}
            placeholder="Nome da rotina"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <ul className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
            {data.activities.map((activity) => {
              const on = selected.includes(activity.id);
              return (
                <li key={activity.id}>
                  <button
                    type="button"
                    className={`activity-template${on ? ' activity-template--on' : ''}`}
                    onClick={() =>
                      setSelected((current) =>
                        on ? current.filter((id) => id !== activity.id) : [...current, activity.id],
                      )
                    }
                  >
                    {activity.name}
                  </button>
                </li>
              );
            })}
          </ul>
          <GameButton
            className="mt-4 w-full"
            disabled={!name.trim() || selected.length === 0}
            onClick={() => {
              void data
                .createRoutine({ name: name.trim(), items: selected })
                .then(() => data.reload())
                .then(() => {
                  setOpen(false);
                  setName('');
                  setSelected([]);
                });
            }}
          >
            Criar rotina
          </GameButton>
        </div>
      </Modal>
    </div>
  );
}
