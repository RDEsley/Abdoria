import { useMemo, useState, type CSSProperties } from 'react';
import {
  AlarmClock,
  BellRing,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Dumbbell,
  Droplets,
  HeartPulse,
  Leaf,
  Pencil,
  Plus,
  ShieldPlus,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { showGameToast } from '@/lib/game-toast';
import {
  PERSONAL_NOTIFICATION_COLORS,
  PERSONAL_NOTIFICATION_ICONS,
  PERSONAL_NOTIFICATION_VERSION,
  describePersonalNotificationSchedule,
  normalizePersonalizedReminders,
  normalizeReminderTimes,
  normalizeReminderWeekdays,
  type PersonalNotificationColor,
  type PersonalNotificationIcon,
  type PersonalNotificationSound,
  type PersonalizedReminder,
} from '@shared/reminders';

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
] as const;

const ICONS = {
  neutral: Circle,
  water: Droplets,
  leaf: Leaf,
  workout: Dumbbell,
  study: BookOpen,
  health: ShieldPlus,
  alarm: AlarmClock,
  heart: HeartPulse,
  star: Star,
} satisfies Record<PersonalNotificationIcon, typeof Circle>;

type RecurrenceDraft = 'once' | 'daily' | 'weekdays';

function emptyDraft() {
  return {
    id: null as string | null,
    title: '',
    message: '',
    recurrence: 'daily' as RecurrenceDraft,
    onceDate: '',
    times: ['19:00'],
    weekdays: [] as number[],
    icon: 'neutral' as PersonalNotificationIcon,
    color: 'neutral' as PersonalNotificationColor,
    sound: 'default' as PersonalNotificationSound,
    enabled: true,
    createdAt: '',
  };
}

type Draft = ReturnType<typeof emptyDraft>;

function reminderToDraft(reminder: PersonalizedReminder): Draft {
  if (reminder.schedule.kind === 'once') {
    const date = new Date(reminder.schedule.at);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    return {
      id: reminder.id,
      title: reminder.title,
      message: reminder.message,
      recurrence: 'once',
      onceDate: local.slice(0, 10),
      times: [local.slice(11, 16)],
      weekdays: [],
      icon: reminder.icon,
      color: reminder.color,
      sound: reminder.sound,
      enabled: reminder.enabled,
      createdAt: reminder.createdAt,
    };
  }
  return {
    id: reminder.id,
    title: reminder.title,
    message: reminder.message,
    recurrence: reminder.schedule.weekdays.length === 7 ? 'daily' : 'weekdays',
    onceDate: '',
    times: reminder.schedule.times,
    weekdays: reminder.schedule.weekdays,
    icon: reminder.icon,
    color: reminder.color,
    sound: reminder.sound,
    enabled: reminder.enabled,
    createdAt: reminder.createdAt,
  };
}

function ResourceIcon({ icon }: { icon: PersonalNotificationIcon }) {
  const Icon = ICONS[icon];
  return <Icon size={18} aria-hidden />;
}

export function ReminderCenter() {
  const { user } = useAuth();
  const { patchPreferences } = useUserPreferences();
  const reminders = useMemo(
    () => normalizePersonalizedReminders(user?.preferencias?.lembretes_personalizados),
    [user?.preferencias?.lembretes_personalizados],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const closeForm = () => {
    setEditing(false);
    setDraft(emptyDraft());
    setError('');
    setAdvancedOpen(false);
  };

  const openCreate = () => {
    setDraft(emptyDraft());
    setError('');
    setAdvancedOpen(false);
    setEditing(true);
  };

  const openEdit = (reminder: PersonalizedReminder) => {
    setDraft(reminderToDraft(reminder));
    setError('');
    setAdvancedOpen(true);
    setEditing(true);
  };

  const buildReminder = (): PersonalizedReminder | null => {
    const title = draft.title.trim();
    const times = normalizeReminderTimes(draft.times);
    if (!title) {
      setError('Informe um título.');
      return null;
    }
    if (times.length === 0) {
      setError('Adicione pelo menos um horário.');
      return null;
    }

    let schedule: PersonalizedReminder['schedule'];
    if (draft.recurrence === 'once') {
      if (!draft.onceDate) {
        setError('Escolha a data da notificação.');
        return null;
      }
      const at = new Date(`${draft.onceDate}T${times[0]}:00`);
      if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) {
        setError('Escolha uma data e horário futuros.');
        return null;
      }
      schedule = { kind: 'once', at: at.toISOString() };
    } else {
      const weekdays =
        draft.recurrence === 'daily'
          ? DAYS.map(({ value }) => value)
          : normalizeReminderWeekdays(draft.weekdays);
      if (weekdays.length === 0) {
        setError('Escolha pelo menos um dia da semana.');
        return null;
      }
      schedule = { kind: 'recurring', times, weekdays };
    }

    const now = new Date().toISOString();
    return {
      version: PERSONAL_NOTIFICATION_VERSION,
      id: draft.id ?? crypto.randomUUID(),
      title,
      message: draft.message.trim(),
      icon: draft.icon,
      color: draft.color,
      sound: draft.sound,
      schedule,
      enabled: draft.enabled,
      createdAt: draft.createdAt || now,
      updatedAt: now,
    };
  };

  const save = async () => {
    const reminder = buildReminder();
    if (!reminder) return;
    setSaving(true);
    setError('');
    try {
      const next = draft.id
        ? reminders.map((item) => (item.id === draft.id ? reminder : item))
        : [...reminders, reminder];
      await patchPreferences({ lembretes_personalizados: next });

      const optOut = user?.preferencias?.notificacoes_opt_out ?? false;
      let finalPermission = await notificationScheduler.permissionState();
      if (!optOut && finalPermission === 'prompt') {
        finalPermission = await notificationScheduler.requestPermission();
      }
      if (!optOut && finalPermission === 'granted') {
        await notificationScheduler.sync(next, { optOut });
      } else if (!optOut) {
        await notificationScheduler.sync(next, { optOut: true });
      }

      showGameToast(draft.id ? 'Notificação atualizada.' : 'Notificação programada.', {
        variant: 'success',
      });
      if (!optOut && (finalPermission === 'denied' || finalPermission === 'unsupported')) {
        showGameToast('Alerta salvo. Ative as notificações do dispositivo para recebê-lo.', {
          variant: 'info',
        });
      }
      closeForm();
    } catch {
      setError('Não foi possível salvar ou programar o alerta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const replace = async (next: PersonalizedReminder[]) => {
    await patchPreferences({ lembretes_personalizados: next });
    const optOut = user?.preferencias?.notificacoes_opt_out ?? false;
    await notificationScheduler.sync(next, { optOut });
  };

  const toggleEnabled = async (reminder: PersonalizedReminder) => {
    const next = reminders.map((item) =>
      item.id === reminder.id
        ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() }
        : item,
    );
    await selectionHaptic();
    await replace(next);
  };

  const remove = async (reminder: PersonalizedReminder) => {
    await replace(reminders.filter((item) => item.id !== reminder.id));
    await notificationScheduler.cancel(reminder.id);
  };

  return (
    <section className="personal-notifications app-surface app-surface--notifications">
      <header className="personal-notifications__header">
        <div>
          <p className="app-section-eyebrow">No seu ritmo</p>
          <h2 className="game-section-title flex items-center gap-2">
            <BellRing size={17} aria-hidden /> Notificações personalizadas
          </h2>
          <p>Alertas locais para qualquer parte da sua rotina.</p>
        </div>
        <button
          type="button"
          onClick={editing ? closeForm : openCreate}
          className="personal-notifications__add"
          aria-label={editing ? 'Fechar formulário' : 'Criar notificação personalizada'}
        >
          {editing ? <X size={19} aria-hidden /> : <Plus size={19} aria-hidden />}
        </button>
      </header>

      {editing && (
        <div className="personal-notification-form" aria-label="Configurar notificação">
          <div className="personal-notification-form__quick">
            <label className="personal-notification-form__title">
              <span>O que você quer lembrar?</span>
              <input
                value={draft.title}
                maxLength={60}
                autoFocus
                placeholder="Ex.: Beber água"
                onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
                aria-invalid={Boolean(error) && !draft.title.trim()}
                aria-describedby={error ? 'personal-notification-error' : undefined}
              />
            </label>

            <div className="personal-notification-form__quick-grid">
              <label>
                <span>Repetição</span>
                <select
                  value={draft.recurrence}
                  onChange={(event) => {
                    void selectionHaptic();
                    setDraft((current) => ({
                      ...current,
                      recurrence: event.target.value as RecurrenceDraft,
                    }));
                  }}
                >
                  <option value="daily">Todos os dias</option>
                  <option value="weekdays">Dias específicos</option>
                  <option value="once">Uma vez</option>
                </select>
              </label>
              <label>
                <span>Horário</span>
                <input
                  type="time"
                  value={draft.times[0] ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      times: [event.target.value, ...current.times.slice(1)],
                    }))
                  }
                />
              </label>
            </div>
          </div>

          {draft.recurrence === 'once' && (
            <label>
              <span>Data</span>
              <input
                type="date"
                value={draft.onceDate}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, onceDate: event.target.value }))
                }
              />
            </label>
          )}

          {draft.recurrence === 'weekdays' && (
            <fieldset className="personal-notification-form__weekday-fieldset">
              <legend>Em quais dias?</legend>
              <div className="personal-notification-form__days">
                {DAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={draft.weekdays.includes(value)}
                    onClick={() => {
                      void selectionHaptic();
                      setDraft((current) => ({
                        ...current,
                        weekdays: current.weekdays.includes(value)
                          ? current.weekdays.filter((day) => day !== value)
                          : [...current.weekdays, value].sort(),
                      }));
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <button
            type="button"
            className="personal-notification-form__advanced-toggle"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <span>
              <SlidersHorizontal size={16} aria-hidden /> Personalizar
            </span>
            <small>Mensagem, horários, ícone, cor e som</small>
            <ChevronDown size={17} aria-hidden />
          </button>

          {advancedOpen && (
            <div className="personal-notification-form__advanced">
              <label>
                <span>
                  Mensagem <small>opcional</small>
                </span>
                <textarea
                  value={draft.message}
                  maxLength={160}
                  rows={2}
                  placeholder="Adicione um contexto curto"
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, message: event.target.value }))
                  }
                />
              </label>

              {draft.recurrence !== 'once' && (
                <fieldset>
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
                              setDraft((current) => ({
                                ...current,
                                times: current.times.map((entry, itemIndex) =>
                                  itemIndex === index ? event.target.value : entry,
                                ),
                              }))
                            }
                          />
                          <button
                            type="button"
                            aria-label={`Remover horário adicional ${index}`}
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                times: current.times.filter((_, itemIndex) => itemIndex !== index),
                              }))
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
                      onClick={() =>
                        setDraft((current) => ({ ...current, times: [...current.times, ''] }))
                      }
                    >
                      <Plus size={15} aria-hidden /> Adicionar horário
                    </button>
                  </div>
                </fieldset>
              )}

              <fieldset>
                <legend>Ícone no Evolyn</legend>
                <div className="personal-notification-form__icons">
                  {PERSONAL_NOTIFICATION_ICONS.map((option) => {
                    const Icon = ICONS[option.id];
                    return (
                      <button
                        key={option.id}
                        type="button"
                        title={option.label}
                        aria-label={option.label}
                        aria-pressed={draft.icon === option.id}
                        onClick={() => {
                          void selectionHaptic();
                          setDraft((value) => ({ ...value, icon: option.id }));
                        }}
                      >
                        <Icon size={18} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend>Cor</legend>
                <div className="personal-notification-form__colors">
                  {PERSONAL_NOTIFICATION_COLORS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      title={option.label}
                      aria-label={option.label}
                      aria-pressed={draft.color === option.id}
                      style={{ '--notification-color': option.hex } as CSSProperties}
                      onClick={() => {
                        void selectionHaptic();
                        setDraft((value) => ({ ...value, color: option.id }));
                      }}
                    >
                      {draft.color === option.id && <Check size={14} aria-hidden />}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Som</legend>
                <div className="personal-notification-form__segments">
                  {(
                    [
                      ['default', 'Padrão'],
                      ['soft', 'Suave'],
                      ['nature', 'Natureza'],
                      ['motivational', 'Motivacional'],
                      ['silent', 'Silencioso'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={draft.sound === value}
                      onClick={() => setDraft((current) => ({ ...current, sound: value }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {error && (
            <p
              id="personal-notification-error"
              role="alert"
              className="personal-notification-form__error"
            >
              {error}
            </p>
          )}
          <div className="personal-notification-form__actions">
            <button type="button" onClick={closeForm}>
              Cancelar
            </button>
            <button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Salvando…' : draft.id ? 'Salvar alterações' : 'Programar'}
            </button>
          </div>
        </div>
      )}

      <div className="personal-notifications__list">
        {reminders.length === 0 && !editing && (
          <div className="personal-notifications__empty">
            <BellRing size={24} aria-hidden />
            <p>Nenhum alerta pessoal programado.</p>
            <small>Crie quando quiser receber um toque do Evolyn.</small>
          </div>
        )}
        {reminders.map((reminder) => (
          <article
            key={reminder.id}
            className={`personal-notification-card personal-notification-card--${reminder.color}`}
          >
            <span className="personal-notification-card__icon">
              <ResourceIcon icon={reminder.icon} />
            </span>
            <div className="personal-notification-card__content">
              <strong>{reminder.title}</strong>
              <small>{describePersonalNotificationSchedule(reminder)}</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-label={`${reminder.enabled ? 'Desativar' : 'Ativar'} ${reminder.title}`}
              aria-checked={reminder.enabled}
              onClick={() => void toggleEnabled(reminder)}
              className="personal-notification-card__switch"
            >
              <span />
            </button>
            <button
              type="button"
              onClick={() => openEdit(reminder)}
              className="personal-notification-card__action"
              aria-label={`Editar ${reminder.title}`}
            >
              <Pencil size={15} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void remove(reminder)}
              className="personal-notification-card__action personal-notification-card__action--danger"
              aria-label={`Excluir ${reminder.title}`}
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
