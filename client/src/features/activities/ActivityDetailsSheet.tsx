import { useEffect, useMemo, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { PickerField } from '@/components/ui/PickerField';
import type { ActivityOccurrence, ActivityRecord, ActivitySchedule } from '@shared/activities';
import { ACTIVITY_CATEGORIES, ACTIVITY_NAME_MAX } from '@shared/activities';

const WEEKDAYS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
] as const;

function scheduleLabel(activity: ActivityRecord): string {
  const schedule = activity.schedule;
  if (!schedule || schedule.kind === 'unscheduled') return 'Quando eu quiser';
  if (schedule.kind === 'daily') return 'Todos os dias';
  if (schedule.weekdays?.length) {
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return schedule.weekdays.map((d) => labels[d] ?? '?').join(', ');
  }
  return 'Agendada';
}

export function ActivityDetailsSheet({
  open,
  occurrence,
  activity,
  onClose,
  onConfirm,
  onSave,
  onArchive,
}: {
  open: boolean;
  occurrence: ActivityOccurrence | null;
  activity: ActivityRecord | null;
  onClose: () => void;
  onConfirm: (payload: { kind: 'full' | 'minimum'; note?: string; value?: number }) => void;
  onSave: (id: string, body: Record<string, unknown>) => Promise<unknown>;
  onArchive: (id: string) => void;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [note, setNote] = useState('');
  const [value, setValue] = useState('');
  const [minimum, setMinimum] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(activity?.category ?? 'mente');
  const [days, setDays] = useState<number[]>([]);
  const [flexible, setFlexible] = useState(true);
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !activity) return;
    setMode('view');
    setNote('');
    setValue('');
    setMinimum(false);
    setName(activity.name);
    setCategory(activity.category);
    const schedule = activity.schedule;
    const isFlex = !schedule || schedule.kind === 'unscheduled';
    setFlexible(isFlex);
    setDays(schedule?.weekdays?.length ? [...schedule.weekdays] : schedule?.kind === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : []);
    setTime(schedule?.times?.[0] ?? '');
  }, [open, activity]);

  const categoryLabel = useMemo(
    () => ACTIVITY_CATEGORIES.find((entry) => entry.id === activity?.category)?.label ?? 'Outro',
    [activity?.category],
  );

  if (!occurrence || !activity) return null;

  const submitEdit = async () => {
    setSaving(true);
    try {
      const scheduled = !flexible && days.length > 0;
      const kind: ActivitySchedule['kind'] = !scheduled
        ? 'unscheduled'
        : days.length === 7
          ? 'daily'
          : 'weekdays';
      await onSave(activity.id, {
        name: name.trim().slice(0, ACTIVITY_NAME_MAX) || activity.name,
        category,
        schedule: {
          kind,
          times: time ? [time] : [],
          weekdays: kind === 'weekdays' ? days : [],
        },
      });
      setMode('view');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="activity-details-title" autoFocus={false}>
      <div className="p-4">
        <div className="activity-details-header">
          <h2 id="activity-details-title" className="game-section-title activity-details-header__title">
            {mode === 'edit' ? 'Editar atividade' : occurrence.name}
          </h2>
          <button
            type="button"
            className="activity-details-header__close"
            aria-label="Fechar detalhes"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {mode === 'view' ? (
          <>
            <dl className="activity-details-meta">
              <div>
                <dt>Categoria</dt>
                <dd>{categoryLabel}</dd>
              </div>
              <div>
                <dt>Quando</dt>
                <dd>{scheduleLabel(activity)}</dd>
              </div>
              <div>
                <dt>Horário</dt>
                <dd>{activity.schedule?.times?.[0] || 'Sem horário fixo'}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="activity-details-edit"
              onClick={() => setMode('edit')}
            >
              <Pencil size={15} aria-hidden />
              Editar
            </button>

            {occurrence.status !== 'done' && (
              <>
                <p className="mb-3 mt-4 text-sm font-semibold text-stone-500">
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
              </>
            )}

            <button
              type="button"
              className="activity-details-remove mt-3"
              onClick={() => onArchive(activity.id)}
            >
              Remover atividade
            </button>
          </>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <input
              className="game-input w-full"
              maxLength={ACTIVITY_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome"
            />
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
            <div className="flex justify-between gap-1" aria-label="Dias da semana">
              {WEEKDAYS.map((day, index) => (
                <button
                  key={`${day.value}-${index}`}
                  type="button"
                  className={`activity-day-chip${days.includes(day.value) && !flexible ? ' is-on' : ''}`}
                  aria-pressed={days.includes(day.value) && !flexible}
                  onClick={() => {
                    setFlexible(false);
                    setDays((current) =>
                      current.includes(day.value)
                        ? current.filter((item) => item !== day.value)
                        : [...current, day.value].sort((a, b) => a - b),
                    );
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`activity-template${flexible || days.length === 0 ? ' activity-template--on' : ''}`}
              onClick={() => {
                setFlexible(true);
                setDays([]);
              }}
            >
              Quando eu quiser
            </button>
            <PickerField
              type="time"
              label="Horário opcional"
              emptyLabel="Selecionar horário"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
            <div className="flex gap-2">
              <GameButton variant="secondary" onClick={() => setMode('view')}>
                Cancelar
              </GameButton>
              <GameButton className="flex-1" disabled={saving} onClick={() => void submitEdit()}>
                {saving ? 'Salvando…' : 'Salvar'}
              </GameButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
