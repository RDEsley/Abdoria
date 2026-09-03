import { Plus, X } from 'lucide-react';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import type { ReminderDraftSlice } from './reminder-form-types';

type ExtraTimesDraft = Pick<ReminderDraftSlice, 'recurrence' | 'times'>;

interface ReminderPersonalizePanelProps {
  draft: ExtraTimesDraft;
  onChange: (patch: Partial<ReminderDraftSlice>) => void;
}

/**
 * Controles que sobram depois da prévia — hoje, só os horários extras de
 * lembretes recorrentes (título, mensagem, ícone e cor já vivem na prévia).
 */
export function ReminderPersonalizePanel({ draft, onChange }: ReminderPersonalizePanelProps) {
  if (draft.recurrence === 'once') return null;

  return (
    <fieldset className="reminder-extra-times">
      <legend>Outros horários</legend>
      <div className="personal-notification-form__times">
        {draft.times.slice(1).map((time, extraIndex) => {
          const index = extraIndex + 1;
          return (
            <div key={index}>
              <input
                type="time"
                value={time}
                aria-label={`Horário adicional ${index}`}
                onChange={(event) =>
                  onChange({
                    times: draft.times.map((entry, itemIndex) =>
                      itemIndex === index ? event.target.value : entry,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label={`Remover horário adicional ${index}`}
                onClick={() =>
                  onChange({
                    times: draft.times.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="personal-notification-form__add-time"
          onClick={() => {
            void selectionHaptic();
            onChange({ times: [...draft.times, ''] });
          }}
        >
          <Plus size={15} aria-hidden /> Adicionar horário
        </button>
      </div>
    </fieldset>
  );
}
