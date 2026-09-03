import { useEffect, useState } from 'react';
import { Bell, Clock3, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import type {
  ActivityRecord,
  ActivityScheduleKind,
  RoutineItemInput,
  RoutineRecord,
} from '@shared/activities';

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
] as const;

const SCHEDULE_OPTIONS: ReadonlyArray<{ id: ActivityScheduleKind; label: string }> = [
  { id: 'daily', label: 'Todos os dias' },
  { id: 'weekdays', label: 'Dias da semana' },
  { id: 'once', label: 'Data específica' },
  { id: 'unscheduled', label: 'Quando quiser' },
];

export interface RoutineEditorPayload {
  name: string;
  items: RoutineItemInput[];
  schedule: RoutineRecord['schedule'];
  reminder: RoutineRecord['reminder'];
}

export function RoutineEditorSheet({
  open,
  onClose,
  activities,
  routine,
  onSubmit,
  onArchive,
}: {
  open: boolean;
  onClose: () => void;
  activities: ActivityRecord[];
  /** Quando presente, o editor abre pré-preenchido em modo edição. */
  routine?: RoutineRecord | null;
  onSubmit: (payload: RoutineEditorPayload) => Promise<unknown>;
  onArchive?: () => Promise<unknown>;
}) {
  const isEdit = Boolean(routine);
  const [name, setName] = useState('');
  const [items, setItems] = useState<RoutineItemInput[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleKind, setScheduleKind] = useState<ActivityScheduleKind>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [onceDate, setOnceDate] = useState('');
  const [time, setTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (routine) {
      setName(routine.name);
      setItems(
        (routine.items ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((item) => ({
            activity_id: item.activity_id,
            scheduled_time: item.scheduled_time ?? null,
            reminder_enabled: item.reminder_enabled ?? false,
          })),
      );
      const schedule = routine.schedule;
      setScheduleOpen(schedule.kind !== 'unscheduled');
      setScheduleKind(schedule.kind === 'unscheduled' ? 'daily' : schedule.kind);
      setWeekdays(schedule.weekdays ?? []);
      setOnceDate(schedule.once_at ? schedule.once_at.slice(0, 10) : '');
      setTime(schedule.times?.[0] ?? '');
      setReminderEnabled(routine.reminder?.enabled ?? false);
    } else {
      setName('');
      setItems([]);
      setScheduleOpen(false);
      setScheduleKind('daily');
      setWeekdays([]);
      setOnceDate('');
      setTime('');
      setReminderEnabled(false);
    }
    setExpandedItemId(null);
  }, [open, routine]);

  const toggleActivity = (activityId: string) => {
    setItems((current) => {
      const exists = current.some((item) => item.activity_id === activityId);
      if (exists) return current.filter((item) => item.activity_id !== activityId);
      return [
        ...current,
        { activity_id: activityId, scheduled_time: null, reminder_enabled: false },
      ];
    });
  };

  const updateItem = (activityId: string, patch: Partial<RoutineItemInput>) => {
    setItems((current) =>
      current.map((item) => (item.activity_id === activityId ? { ...item, ...patch } : item)),
    );
  };

  const canSubmit = name.trim().length > 0 && items.length > 0 && !busy;

  const submit = async () => {
    setBusy(true);
    try {
      const kind: ActivityScheduleKind = scheduleOpen ? scheduleKind : 'unscheduled';
      const schedule: RoutineRecord['schedule'] = {
        kind,
        weekdays: kind === 'weekdays' ? weekdays : [],
        times: kind !== 'unscheduled' && time ? [time] : [],
        period: null,
        once_at: kind === 'once' && onceDate ? `${onceDate}T${time || '00:00'}:00` : null,
      };
      const reminder: RoutineRecord['reminder'] = {
        enabled: reminderEnabled && kind !== 'unscheduled' && (schedule.times?.length ?? 0) > 0,
        offset_min: 0,
        follow_up: false,
      };
      await onSubmit({ name: name.trim(), items, schedule, reminder });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="routine-editor-title">
      <div className="p-4">
        <h2 id="routine-editor-title" className="game-section-title">
          {isEdit ? 'Editar rotina' : 'Nova rotina'}
        </h2>

        <input
          className="game-input mt-2 w-full"
          maxLength={40}
          placeholder="Ex.: Segunda-feira, Manhã, Pós-treino"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <p className="mt-3 text-[0.7rem] font-extrabold uppercase tracking-wide text-stone-400">
          Atividades
        </p>
        <ul className="mt-1 flex max-h-56 flex-col gap-2 overflow-y-auto">
          {activities.length === 0 && (
            <p className="text-sm font-semibold text-stone-500">
              Crie uma atividade antes de montar sua rotina.
            </p>
          )}
          {activities.map((activity) => {
            const item = items.find((entry) => entry.activity_id === activity.id);
            const on = Boolean(item);
            const expanded = expandedItemId === activity.id;
            return (
              <li key={activity.id} className="routine-item-row">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`activity-template flex-1${on ? ' activity-template--on' : ''}`}
                    onClick={() => toggleActivity(activity.id)}
                  >
                    <strong>{activity.name}</strong>
                    {item?.scheduled_time && <small>{item.scheduled_time}</small>}
                  </button>
                  {on && (
                    <button
                      type="button"
                      className="routine-item-row__time-toggle"
                      aria-label={`Horário de ${activity.name}`}
                      aria-pressed={expanded}
                      onClick={() => setExpandedItemId(expanded ? null : activity.id)}
                    >
                      <Clock3 size={16} aria-hidden />
                    </button>
                  )}
                </div>
                {on && expanded && (
                  <div className="routine-item-row__details">
                    <label className="onb-field">
                      <input
                        type="time"
                        value={item?.scheduled_time ?? ''}
                        onChange={(event) =>
                          updateItem(activity.id, {
                            scheduled_time: event.target.value || null,
                            reminder_enabled: event.target.value
                              ? (item?.reminder_enabled ?? false)
                              : false,
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-stone-600">
                      <input
                        type="checkbox"
                        checked={item?.reminder_enabled ?? false}
                        disabled={!item?.scheduled_time}
                        onChange={(event) =>
                          updateItem(activity.id, { reminder_enabled: event.target.checked })
                        }
                      />
                      Lembrar deste item
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="routine-schedule-toggle mt-4"
          onClick={() =>
            setScheduleOpen((value) => {
              const next = !value;
              if (next && scheduleKind === 'unscheduled') setScheduleKind('daily');
              return next;
            })
          }
        >
          <Bell size={15} aria-hidden />
          {scheduleOpen ? 'Agenda desta rotina' : 'Adicionar agenda (opcional)'}
        </button>

        {scheduleOpen && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`activity-template${scheduleKind === option.id ? ' activity-template--on' : ''}`}
                  onClick={() => setScheduleKind(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {scheduleKind === 'weekdays' && (
              <fieldset className="personal-notification-form__weekday-fieldset">
                <legend>Em quais dias?</legend>
                <div className="personal-notification-form__days">
                  {WEEKDAYS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={weekdays.includes(value)}
                      onClick={() => {
                        void selectionHaptic();
                        setWeekdays((current) =>
                          current.includes(value)
                            ? current.filter((day) => day !== value)
                            : [...current, value].sort((a, b) => a - b),
                        );
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {scheduleKind === 'once' && (
              <label className="onb-field">
                <input
                  type="date"
                  value={onceDate}
                  onChange={(event) => setOnceDate(event.target.value)}
                />
              </label>
            )}

            {scheduleKind !== 'unscheduled' && (
              <label className="onb-field">
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            )}

            {scheduleKind !== 'unscheduled' && time && (
              <label className="flex flex-col gap-1 text-sm font-bold text-stone-700">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(event) => setReminderEnabled(event.target.checked)}
                  />
                  Lembrar desta rotina
                </span>
                <small className="font-semibold text-stone-500">
                  Você receberá avisos no horário configurado para esta rotina. Os itens com horário
                  próprio podem lembrar em cada etapa, se você ativar.
                </small>
              </label>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          {isEdit && onArchive && (
            <GameButton
              variant="ghost"
              className="!text-red-700"
              disabled={busy || archiving}
              onClick={() => {
                setArchiving(true);
                void onArchive()
                  .then(onClose)
                  .finally(() => setArchiving(false));
              }}
            >
              <Trash2 size={16} aria-hidden /> {archiving ? 'Arquivando…' : 'Arquivar'}
            </GameButton>
          )}
          <GameButton className="flex-1" disabled={!canSubmit} onClick={() => void submit()}>
            {busy ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar rotina'}
          </GameButton>
        </div>
      </div>
    </Modal>
  );
}
