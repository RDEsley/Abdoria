import { useMemo, useState } from 'react';
import { BellRing, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { showGameToast } from '@/lib/game-toast';
import {
  PERSONAL_NOTIFICATION_VERSION,
  describePersonalNotificationSchedule,
  normalizePersonalizedReminders,
  normalizeReminderTimes,
  normalizeReminderWeekdays,
  type PersonalNotificationColor,
  type PersonalNotificationIcon,
  type PersonalizedReminder,
} from '@shared/reminders';
import { DEFAULT_REMINDER_SOUND, listUnlockedReminderPacks, type ReminderSoundId } from '@shared/reminder-sounds';
import { ReminderIcon } from './reminder-icons';
import { ReminderNotificationPreview } from './ReminderNotificationPreview';
import { ReminderPersonalizePanel } from './ReminderPersonalizePanel';
import type { RecurrenceDraft } from './reminder-form-types';

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
] as const;

function emptyDraft(): Draft {
  return {
    id: null,
    title: '',
    message: '',
    recurrence: 'daily',
    onceDate: '',
    times: ['19:00'],
    weekdays: [],
    icon: 'neutral',
    color: 'neutral',
    sound: DEFAULT_REMINDER_SOUND,
    enabled: true,
    createdAt: '',
  };
}

interface Draft {
  id: string | null;
  title: string;
  message: string;
  recurrence: RecurrenceDraft;
  onceDate: string;
  times: string[];
  weekdays: number[];
  icon: PersonalNotificationIcon;
  color: PersonalNotificationColor;
  sound: ReminderSoundId;
  enabled: boolean;
  createdAt: string;
}

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

export function ReminderCenter() {
  const { user } = useAuth();
  const { patchPreferences } = useUserPreferences();
  const unlockedPacks = listUnlockedReminderPacks(user?.cosmeticos?.desbloqueados);
  const syncOptions = {
    optOut: user?.preferencias?.notificacoes_opt_out ?? false,
    unlockedSoundPacks: unlockedPacks,
  };
  const reminders = useMemo(
    () => normalizePersonalizedReminders(user?.preferencias?.lembretes_personalizados),
    [user?.preferencias?.lembretes_personalizados],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const closeForm = () => {
    setEditing(false);
    setDraft(emptyDraft());
    setError('');
  };

  const openCreate = () => {
    setDraft(emptyDraft());
    setError('');
    setEditing(true);
  };

  const openEdit = (reminder: PersonalizedReminder) => {
    setDraft(reminderToDraft(reminder));
    setError('');
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
      const nowMs = new Date().getTime();
      if (!Number.isFinite(at.getTime()) || at.getTime() <= nowMs) {
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

      const optOut = syncOptions.optOut;
      let finalPermission = await notificationScheduler.permissionState();
      if (!optOut && finalPermission === 'prompt') {
        finalPermission = await notificationScheduler.requestPermission();
      }
      if (!optOut && finalPermission === 'granted') {
        await notificationScheduler.sync(next, syncOptions);
      } else if (!optOut) {
        await notificationScheduler.sync(next, { ...syncOptions, optOut: true });
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
    const optOut = syncOptions.optOut;
    await notificationScheduler.sync(next, { ...syncOptions, optOut });
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
    <section className="personal-notifications">
      <header className="personal-notifications__header">
        <div>
          <h2 className="game-section-title flex items-center gap-2">
            <BellRing size={17} aria-hidden /> Lembretes personalizados
          </h2>
          <p>Crie alertas locais para água, treino, estudo ou o que fizer sentido pra você.</p>
        </div>
      </header>

      {!editing && (
        <button type="button" onClick={openCreate} className="personal-notifications__create">
          <Plus size={18} aria-hidden />
          Novo lembrete
        </button>
      )}

      {editing && (
        <div className="personal-notification-form personal-notification-form--flat" aria-label="Configurar notificação">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-stone-800">
              {draft.id ? 'Editar lembrete' : 'Novo lembrete'}
            </p>
            <button
              type="button"
              onClick={closeForm}
              className="personal-notifications__add"
              aria-label="Fechar formulário"
            >
              <X size={19} aria-hidden />
            </button>
          </div>
          <ReminderNotificationPreview
            draft={draft}
            unlockedPacks={unlockedPacks}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            titleInvalid={Boolean(error) && !draft.title.trim()}
            errorId={error ? 'personal-notification-error' : undefined}
          />

          <ReminderPersonalizePanel
            draft={draft}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />

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
              <ReminderIcon icon={reminder.icon} />
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
