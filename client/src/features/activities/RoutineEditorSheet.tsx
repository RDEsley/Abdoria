import { useEffect, useMemo, useState } from 'react';
import { Clock3, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { PickerField } from '@/components/ui/PickerField';
import {
  reminderPermissionHint,
  useEnsureReminderPermission,
} from '@/hooks/useEnsureReminderPermission';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import {
  resolveRoutineHealth,
  type ActivityRecord,
  type ActivityScheduleKind,
  type RoutineItemInput,
  type RoutineRecord,
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
  { id: 'unscheduled', label: 'Quando eu quiser' },
];

const CREATE_STEPS = ['Montar rotina', 'Agenda', 'Revisar'] as const;

export interface RoutineEditorPayload {
  name: string;
  items: RoutineItemInput[];
  schedule: RoutineRecord['schedule'];
  reminder: RoutineRecord['reminder'];
}

function formatOnceLabel(onceDate: string) {
  if (!onceDate) return 'Data específica';
  const [year, month, day] = onceDate.split('-');
  if (!year || !month || !day) return onceDate;
  return `${day}/${month}/${year}`;
}

function describeAgenda(
  kind: ActivityScheduleKind,
  weekdays: number[],
  onceDate: string,
): string {
  if (kind === 'unscheduled') return 'Quando eu quiser';
  if (kind === 'daily') return 'Todos os dias';
  if (kind === 'once') return formatOnceLabel(onceDate);
  if (weekdays.length === 0) return 'Dias da semana';
  return WEEKDAYS.filter((day) => weekdays.includes(day.value))
    .map((day) => day.label)
    .join(', ');
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
  const { permission, capability, canDeliverReminders, ensureCanEnableReminder } =
    useEnsureReminderPermission();
  const reminderHint = reminderPermissionHint(
    capability === 'opt_out' ? 'opt_out' : permission,
    canDeliverReminders,
  );
  const [createStep, setCreateStep] = useState(0);
  const [editTab, setEditTab] = useState<'rotina' | 'agenda'>('rotina');
  const [name, setName] = useState('');
  const [items, setItems] = useState<RoutineItemInput[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [scheduleKind, setScheduleKind] = useState<ActivityScheduleKind>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [onceDate, setOnceDate] = useState('');
  const [time, setTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [staleRemovedCount, setStaleRemovedCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    const liveIds = new Set(activities.map((activity) => activity.id));
    if (routine) {
      setName(routine.name);
      const health = resolveRoutineHealth(routine, liveIds);
      setStaleRemovedCount(health.unavailableItems);
      setItems(
        (routine.items ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .filter((item) => liveIds.has(item.activity_id))
          .map((item) => ({
            activity_id: item.activity_id,
            scheduled_time: item.scheduled_time ?? null,
            reminder_enabled: item.reminder_enabled ?? false,
          })),
      );
      const schedule = routine.schedule;
      setScheduleKind(schedule.kind);
      setWeekdays(schedule.weekdays ?? []);
      setOnceDate(schedule.once_at ? schedule.once_at.slice(0, 10) : '');
      setTime(schedule.times?.[0] ?? '');
      setReminderEnabled(routine.reminder?.enabled ?? false);
      setEditTab('rotina');
    } else {
      setName('');
      setItems([]);
      setStaleRemovedCount(0);
      setScheduleKind('daily');
      setWeekdays([]);
      setOnceDate('');
      setTime('');
      setReminderEnabled(false);
      setCreateStep(0);
    }
    setExpandedItemId(null);
    setBusy(false);
    setArchiving(false);
  }, [open, routine, activities]);

  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  );

  const selectedActivities = useMemo(
    () =>
      items
        .map((item) => activityById.get(item.activity_id))
        .filter((activity): activity is ActivityRecord => Boolean(activity)),
    [items, activityById],
  );

  const canAdvanceStep0 = name.trim().length > 0 && selectedActivities.length > 0 && !busy;
  const canSubmit = name.trim().length > 0 && selectedActivities.length > 0 && !busy;
  const scheduled = scheduleKind !== 'unscheduled';

  const reminderCount = (() => {
    if (!scheduled) return 0;
    const itemReminders = items.filter(
      (item) => item.reminder_enabled && item.scheduled_time,
    ).length;
    return (reminderEnabled && time ? 1 : 0) + itemReminders;
  })();

  const agendaLabel = describeAgenda(scheduleKind, weekdays, onceDate);

  const reviewActivityLine = (() => {
    const names = selectedActivities.map((activity) => activity.name);
    if (names.length === 0) return 'Nenhuma atividade';
    const preview = names.slice(0, 3);
    const extra = names.length - preview.length;
    return extra > 0 ? `${preview.join(', ')} +${extra}` : preview.join(', ');
  })();

  const toggleActivity = (activityId: string) => {
    setItems((current) => {
      const exists = current.some((item) => item.activity_id === activityId);
      if (exists) {
        if (expandedItemId === activityId) setExpandedItemId(null);
        return current.filter((item) => item.activity_id !== activityId);
      }
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

  const buildPayload = (): RoutineEditorPayload => {
    const kind = scheduleKind;
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
    return {
      name: name.trim(),
      items: items.filter((item) => activityById.has(item.activity_id)),
      schedule,
      reminder,
    };
  };

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(buildPayload());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const skipSchedule = () => {
    setScheduleKind('unscheduled');
    setTime('');
    setReminderEnabled(false);
    setWeekdays([]);
    setOnceDate('');
    setItems((current) =>
      current.map((item) => ({ ...item, scheduled_time: null, reminder_enabled: false })),
    );
    setExpandedItemId(null);
    setCreateStep(2);
  };

  const handleArchive = () => {
    if (!onArchive) return;
    setArchiving(true);
    void onArchive()
      .then(onClose)
      .finally(() => setArchiving(false));
  };

  const title = isEdit
    ? 'Editar rotina'
    : CREATE_STEPS[createStep] === 'Montar rotina'
      ? 'Montar rotina'
      : createStep === 1
        ? 'Quando essa rotina acontece?'
        : 'Revisar';

  const renderActivityChecklist = (withTimes: boolean) => (
    <ul className="mt-1 flex max-h-56 flex-col gap-2 overflow-y-auto">
      {activities.length === 0 && (
        <p className="text-sm font-semibold text-stone-500">
          Crie uma atividade antes de montar sua rotina.
        </p>
      )}
      {activities.map((activity) => {
        const item = items.find((entry) => entry.activity_id === activity.id);
        const on = Boolean(item);
        return (
          <li key={activity.id} className="routine-item-row">
            <button
              type="button"
              className={`activity-template${on ? ' activity-template--on' : ''}`}
              onClick={() => toggleActivity(activity.id)}
            >
              <strong>{activity.name}</strong>
              {withTimes && item?.scheduled_time ? <small>{item.scheduled_time}</small> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const renderItemTimes = () => {
    if (selectedActivities.length === 0) {
      return (
        <p className="text-sm font-semibold text-stone-500">
          Selecione atividades na rotina para definir horários por etapa.
        </p>
      );
    }
    return (
      <ul className="flex flex-col gap-2">
        {selectedActivities.map((activity) => {
          const item = items.find((entry) => entry.activity_id === activity.id);
          if (!item) return null;
          const expanded = expandedItemId === activity.id;
          return (
            <li key={activity.id} className="routine-item-row">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`activity-template flex-1${expanded ? ' activity-template--on' : ''}`}
                  onClick={() => setExpandedItemId(expanded ? null : activity.id)}
                >
                  <strong>{activity.name}</strong>
                  {item.scheduled_time ? <small>{item.scheduled_time}</small> : <small>Sem horário</small>}
                </button>
                <button
                  type="button"
                  className="routine-item-row__time-toggle"
                  aria-label={`Horário de ${activity.name}`}
                  aria-pressed={expanded}
                  onClick={() => setExpandedItemId(expanded ? null : activity.id)}
                >
                  <Clock3 size={16} aria-hidden />
                </button>
              </div>
              {expanded && (
                <div className="routine-item-row__details">
                  <PickerField
                    type="time"
                    label="Horário desta etapa"
                    emptyLabel="Selecionar horário"
                    icon={<Clock3 size={14} aria-hidden />}
                    value={item.scheduled_time ?? ''}
                    onChange={(event) =>
                      updateItem(activity.id, {
                        scheduled_time: event.target.value || null,
                        reminder_enabled: event.target.value
                          ? item.reminder_enabled
                          : false,
                      })
                    }
                  />
                  <label className="mt-2 flex flex-col gap-1 text-xs font-bold text-stone-600">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.reminder_enabled}
                        disabled={!item.scheduled_time}
                        onChange={(event) => {
                          const next = event.target.checked;
                          if (!next) {
                            updateItem(activity.id, { reminder_enabled: false });
                            return;
                          }
                          void ensureCanEnableReminder().then((ok) => {
                            if (ok) updateItem(activity.id, { reminder_enabled: true });
                          });
                        }}
                      />
                      Lembrar deste item
                    </span>
                    {!item.scheduled_time ? (
                      <small className="font-semibold text-stone-500">
                        Escolha um horário para poder lembrar desta etapa.
                      </small>
                    ) : reminderHint ? (
                      <small className="font-semibold text-amber-700">{reminderHint}</small>
                    ) : null}
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderScheduleOptions = () => (
    <div className="flex flex-col gap-2">
      {SCHEDULE_OPTIONS.map((option) => {
        const selected = scheduleKind === option.id;
        return (
          <div key={option.id} className="routine-schedule-option">
            <button
              type="button"
              className={`activity-template${selected ? ' activity-template--on' : ''}`}
              onClick={() => {
                setScheduleKind(option.id);
                if (option.id === 'unscheduled') {
                  setReminderEnabled(false);
                  setExpandedItemId(null);
                }
              }}
            >
              {option.label}
            </button>
            {selected && option.id === 'weekdays' && (
              <fieldset className="personal-notification-form__weekday-fieldset">
                <legend className="sr-only">Em quais dias?</legend>
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
            {selected && option.id === 'once' && (
              <PickerField
                type="date"
                label="Data da rotina"
                emptyLabel="Selecionar data"
                value={onceDate}
                onChange={(event) => setOnceDate(event.target.value)}
              />
            )}
          </div>
        );
      })}

      {scheduled && (
        <>
          <PickerField
            type="time"
            label="Horário da rotina"
            emptyLabel="Selecionar horário"
            icon={<Clock3 size={14} aria-hidden />}
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
          {time && (
            <label className="flex flex-col gap-1 text-sm font-bold text-stone-700">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(event) => {
                    const next = event.target.checked;
                    if (!next) {
                      setReminderEnabled(false);
                      return;
                    }
                    void ensureCanEnableReminder().then((ok) => {
                      if (ok) setReminderEnabled(true);
                    });
                  }}
                />
                Lembrar desta rotina
              </span>
              <small className="font-semibold text-stone-500">
                Você receberá avisos no horário configurado para esta rotina. Os itens com horário
                próprio podem lembrar em cada etapa, se você ativar.
              </small>
              {reminderHint ? (
                <small className="font-semibold text-amber-700">{reminderHint}</small>
              ) : null}
            </label>
          )}
        </>
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} labelledBy="routine-editor-title">
      <div className="routine-editor p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {!isEdit && (
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-stone-400">
                Passo {createStep + 1} de 3
              </p>
            )}
            <h2 id="routine-editor-title" className="game-section-title">
              {title}
            </h2>
          </div>
          <button type="button" className="game-icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={18} aria-hidden />
          </button>
        </div>

        {isEdit && (
          <div className="routine-editor-tabs mt-3" role="tablist" aria-label="Seções da rotina">
            <button
              type="button"
              role="tab"
              aria-selected={editTab === 'rotina'}
              className={`game-tab${editTab === 'rotina' ? ' game-tab--active' : ''}`}
              onClick={() => setEditTab('rotina')}
            >
              Rotina
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editTab === 'agenda'}
              className={`game-tab${editTab === 'agenda' ? ' game-tab--active' : ''}`}
              onClick={() => setEditTab('agenda')}
            >
              Agenda
            </button>
          </div>
        )}

        {isEdit && staleRemovedCount > 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
            {staleRemovedCount} atividade{staleRemovedCount === 1 ? '' : 's'} removida
            {staleRemovedCount === 1 ? '' : 's'} precisa
            {staleRemovedCount === 1 ? '' : 'm'} ser substituída
            {staleRemovedCount === 1 ? '' : 's'}.
          </p>
        ) : null}

        {((!isEdit && createStep === 0) || (isEdit && editTab === 'rotina')) && (
          <div className="mt-3">
            <input
              className="game-input w-full"
              maxLength={40}
              placeholder="Ex.: Segunda-feira, Manhã, Pós-treino"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="mt-3 text-[0.7rem] font-extrabold uppercase tracking-wide text-stone-400">
              Atividades
            </p>
            {renderActivityChecklist(false)}
          </div>
        )}

        {!isEdit && createStep === 1 && (
          <div className="routine-editor-agenda mt-3">
            <div className="routine-editor-agenda__scroll">
              {renderScheduleOptions()}
              {scheduled && (
                <>
                  <p className="mt-3 text-[0.7rem] font-extrabold uppercase tracking-wide text-stone-400">
                    Horários por atividade
                  </p>
                  <div className="mt-1">{renderItemTimes()}</div>
                </>
              )}
            </div>
          </div>
        )}

        {!isEdit && createStep === 2 && (
          <div className="routine-editor-summary mt-3">
            <p className="routine-editor-summary__title">{name.trim() || 'Rotina'}</p>
            <ul className="routine-editor-summary__list">
              <li>
                <span>Atividades</span>
                <strong>
                  {items.filter((item) => activityById.has(item.activity_id)).length} ·{' '}
                  {reviewActivityLine}
                </strong>
              </li>
              <li>
                <span>Agenda</span>
                <strong>{agendaLabel}</strong>
              </li>
              <li>
                <span>Horário</span>
                <strong>{scheduled && time ? time : 'Sem horário fixo'}</strong>
              </li>
              <li>
                <span>Lembretes</span>
                <strong>
                  {reminderCount === 0
                    ? 'Nenhum'
                    : `${reminderCount} lembrete${reminderCount === 1 ? '' : 's'}`}
                </strong>
              </li>
            </ul>
          </div>
        )}

        {isEdit && editTab === 'agenda' && (
          <div className="routine-editor-agenda mt-3">
            <div className="routine-editor-agenda__scroll">
              {renderScheduleOptions()}
              {scheduled && (
                <>
                  <p className="mt-3 text-[0.7rem] font-extrabold uppercase tracking-wide text-stone-400">
                    Horários por atividade
                  </p>
                  <div className="mt-1">{renderItemTimes()}</div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="routine-editor__footer mt-4 flex flex-wrap items-center gap-2">
          {isEdit ? (
            <>
              {onArchive && (
                <GameButton
                  variant="ghost"
                  className="!text-red-700"
                  disabled={busy || archiving}
                  onClick={handleArchive}
                >
                  {archiving ? 'Arquivando…' : 'Arquivar'}
                </GameButton>
              )}
              <GameButton className="flex-1" disabled={!canSubmit} onClick={() => void submit()}>
                {busy ? 'Salvando…' : 'Salvar alterações'}
              </GameButton>
            </>
          ) : createStep === 0 ? (
            <>
              <GameButton variant="secondary" disabled={busy} onClick={onClose}>
                Cancelar
              </GameButton>
              <GameButton
                className="flex-1"
                disabled={!canAdvanceStep0}
                onClick={() => setCreateStep(1)}
              >
                Próximo
              </GameButton>
            </>
          ) : createStep === 1 ? (
            <>
              <GameButton variant="secondary" disabled={busy} onClick={() => setCreateStep(0)}>
                Voltar
              </GameButton>
              <GameButton variant="ghost" disabled={busy} onClick={skipSchedule}>
                Pular por agora
              </GameButton>
              <GameButton className="flex-1" disabled={busy} onClick={() => setCreateStep(2)}>
                Próximo
              </GameButton>
            </>
          ) : (
            <>
              <GameButton variant="secondary" disabled={busy} onClick={() => setCreateStep(1)}>
                Voltar
              </GameButton>
              <GameButton className="flex-1" disabled={!canSubmit} onClick={() => void submit()}>
                {busy ? 'Criando…' : 'Criar rotina'}
              </GameButton>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
