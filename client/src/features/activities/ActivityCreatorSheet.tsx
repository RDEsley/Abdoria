import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import {
  ACTIVITY_TEMPLATES,
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
  type ActivitySchedule,
} from '@shared/activities';

const STEPS = ['Nome', 'Modelo', 'Quando', 'Lembrar'] as const;

export function ActivityCreatorSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [category, setCategory] = useState<ActivityCategory>('mente');
  const [kind, setKind] = useState<ActivitySchedule['kind']>('daily');
  const [time, setTime] = useState('');
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);

  const template = useMemo(
    () => ACTIVITY_TEMPLATES.find((item) => item.id === templateId) ?? null,
    [templateId],
  );

  const reset = () => {
    setStep(0);
    setName('');
    setTemplateId(null);
    setCategory('mente');
    setKind('daily');
    setTime('');
    setRemind(false);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await onCreate({
        name: name.trim() || template?.name || 'Atividade',
        category: template?.category ?? category,
        template_id: template?.id ?? null,
        icon: template?.icon ?? 'star',
        color: template?.color ?? 'emerald',
        metric_kind: template?.metric_kind ?? 'none',
        metric_unit: template?.metric_unit ?? null,
        goal_value: template?.goal_value ?? null,
        schedule: {
          kind,
          times: time ? [time] : [],
          weekdays: kind === 'weekdays' ? [1, 2, 3, 4, 5] : [],
        },
        reminder: { enabled: remind && Boolean(time), offset_min: 0, follow_up: false },
      });
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="activity-creator-title">
      <div className="p-4">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-stone-400">
          {STEPS[step]}
        </p>
        <h2 id="activity-creator-title" className="game-section-title">
          Nova atividade
        </h2>

        {step === 0 && (
          <input
            className="game-input mt-2 w-full"
            maxLength={40}
            placeholder="Ex.: Leitura da noite"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}

        {step === 1 && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_CATEGORIES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`game-tab${category === entry.id ? ' game-tab--active' : ''}`}
                  onClick={() => setCategory(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            {ACTIVITY_TEMPLATES.filter((item) => item.category === category).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`activity-template${templateId === item.id ? ' activity-template--on' : ''}`}
                onClick={() => {
                  setTemplateId(item.id);
                  if (!name) setName(item.name);
                }}
              >
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                ['daily', 'Todos os dias'],
                ['weekdays', 'Dias úteis'],
                ['unscheduled', 'Quando quiser'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`activity-template${kind === id ? ' activity-template--on' : ''}`}
                onClick={() => setKind(id)}
              >
                {label}
              </button>
            ))}
            {kind !== 'unscheduled' && (
              <label className="onb-field mt-2">
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            )}
          </div>
        )}

        {step === 3 && (
          <label className="mt-3 flex items-center gap-2 text-sm font-bold text-stone-700">
            <input
              type="checkbox"
              checked={remind}
              onChange={(event) => setRemind(event.target.checked)}
              disabled={!time}
            />
            Lembrar neste horário
          </label>
        )}

        <div className="mt-4 flex gap-2">
          {step > 0 && (
            <GameButton variant="secondary" onClick={() => setStep((value) => value - 1)}>
              Voltar
            </GameButton>
          )}
          {step < STEPS.length - 1 ? (
            <GameButton className="flex-1" onClick={() => setStep((value) => value + 1)}>
              Continuar
            </GameButton>
          ) : (
            <GameButton className="flex-1" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Salvando…' : 'Criar'}
            </GameButton>
          )}
        </div>
      </div>
    </Modal>
  );
}
