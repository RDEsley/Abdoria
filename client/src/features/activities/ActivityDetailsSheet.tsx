import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import type { ActivityOccurrence, ActivityRecord } from '@shared/activities';

export function ActivityDetailsSheet({
  open,
  occurrence,
  activity,
  onClose,
  onConfirm,
}: {
  open: boolean;
  occurrence: ActivityOccurrence | null;
  activity: ActivityRecord | null;
  onClose: () => void;
  onConfirm: (payload: { kind: 'full' | 'minimum'; note?: string; value?: number }) => void;
}) {
  const [note, setNote] = useState('');
  const [value, setValue] = useState('');
  const [minimum, setMinimum] = useState(false);
  if (!occurrence || !activity) return null;

  return (
    <Modal open={open} onClose={onClose} labelledBy="activity-details-title">
      <div className="p-4">
        <h2 id="activity-details-title" className="game-section-title">
          {occurrence.name}
        </h2>
        <p className="mb-3 text-sm font-semibold text-stone-500">
          Opcional — o check já registra o dia. Aqui você só acrescenta detalhes.
        </p>
        {activity.metric_kind !== 'none' && (
          <label className="onb-field mb-3">
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={activity.metric_unit ?? 'valor'}
            />
            <span className="onb-field__suffix">{activity.metric_unit ?? ''}</span>
          </label>
        )}
        <textarea
          className="game-input mb-3 min-h-24 w-full"
          maxLength={400}
          placeholder="Uma nota rápida (opcional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {activity.minimum_value != null && (
          <label className="mb-4 flex items-center gap-2 text-sm font-bold text-stone-700">
            <input
              type="checkbox"
              checked={minimum}
              onChange={(event) => setMinimum(event.target.checked)}
            />
            Versão mínima
          </label>
        )}
        <GameButton
          className="w-full"
          onClick={() =>
            onConfirm({
              kind: minimum ? 'minimum' : 'full',
              note: note.trim() || undefined,
              value: value ? Number(value) : undefined,
            })
          }
        >
          Registrar
        </GameButton>
      </div>
    </Modal>
  );
}
