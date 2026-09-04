import { useMemo, useState } from 'react';
import { BellRing, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useEnsureReminderPermission } from '@/hooks/useEnsureReminderPermission';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { showGameToast } from '@/lib/game-toast';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import {
  PERSONAL_NOTIFICATION_VERSION,
  summarizePersonalNotificationSchedule,
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

const REMINDER_DELETE_SKIP_KEY = 'evolyn:reminder-delete-skip-confirm';

function readSkipDeleteConfirm(): boolean {
  try {
    return localStorage.getItem(REMINDER_DELETE_SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSkipDeleteConfirm(): void {
  try {
    localStorage.setItem(REMINDER_DELETE_SKIP_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

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
  const { ensureCanEnableReminder, canDeliverReminders } = useEnsureReminderPermission();
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
  const [pendingDelete, setPendingDelete] = useState<PersonalizedReminder | null>(null);
  const [skipConfirmChecked, setSkipConfirmChecked] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    if (reminder.enabled) {
      const ok = await ensureCanEnableReminder();
      if (!ok) {
        setError('Ative as notificações para receber este aviso.');
        return;
      }
    }
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
    const turningOn = !reminder.enabled;
    if (turningOn) {
      const ok = await ensureCanEnableReminder();
      if (!ok) return;
    }
    const next = reminders.map((item) =>
      item.id === reminder.id
        ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() }
        : item,
    );
    await selectionHaptic();
    await replace(next);
  };

  const remove = async (
    reminder: PersonalizedReminder,
    options?: { rememberSkip?: boolean },
  ) => {
    if (deletingId) return;
    setDeletingId(reminder.id);
    const index = reminders.findIndex((item) => item.id === reminder.id);
    const next = reminders.filter((item) => item.id !== reminder.id);
    try {
      // replace → patchPreferences + sync(next). No nativo, sync já cancela
      // todos os personalizados pendentes e reagenda só os restantes.
      await replace(next);
    } catch {
      showGameToast('Não foi possível excluir o lembrete.', { variant: 'error' });
      setDeletingId(null);
      return;
    }

    // Limpeza residual (ex.: chaves web). Falha aqui ≠ falha da exclusão.
    try {
      await notificationScheduler.cancel(reminder.id);
    } catch {
      /* sync já refletiu a lista; cancel é best-effort */
    }

    if (options?.rememberSkip) writeSkipDeleteConfirm();
    showGameToast('Lembrete excluído', {
      variant: 'info',
      duration: 5000,
      actionLabel: 'Desfazer',
      onAction: () => {
        void (async () => {
          try {
            const restored = [...next];
            const insertAt = index >= 0 ? index : restored.length;
            restored.splice(insertAt, 0, reminder);
            await replace(restored);
          } catch {
            showGameToast('Não foi possível restaurar o lembrete.', { variant: 'error' });
          }
        })();
      },
    });
    setPendingDelete(null);
    setSkipConfirmChecked(false);
    setDeletingId(null);
  };

  const requestRemove = (reminder: PersonalizedReminder) => {
    if (readSkipDeleteConfirm()) {
      void remove(reminder);
      return;
    }
    setSkipConfirmChecked(false);
    setPendingDelete(reminder);
  };

  return (
    <section className="personal-notifications">
      <header className="personal-notifications__header">
        <div>
          <h2 className="game-section-title flex items-center gap-2">
            <BellRing size={17} aria-hidden /> Lembretes personalizados
          </h2>
          {!editing ? (
            <p>
              Crie alertas locais para beber água, treino, estudo ou o que fizer sentido pra você.
            </p>
          ) : null}
          {!canDeliverReminders ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              Ative as notificações para receber estes avisos.
            </p>
          ) : null}
        </div>
      </header>

      <div className="personal-notifications__composer">
        {!editing && (
          <button type="button" onClick={openCreate} className="personal-notifications__create">
            <Plus size={18} aria-hidden />
            Novo lembrete
          </button>
        )}

        {editing && (
          <div
            className="personal-notification-form personal-notification-form--flat"
            aria-label="Configurar notificação"
          >
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
      </div>

      <div
        className={`personal-notifications__list${editing && reminders.length > 0 ? ' personal-notifications__list--separated' : ''}`}
      >
        {editing && reminders.length > 0 ? (
          <p className="personal-notifications__list-label">Seus lembretes</p>
        ) : null}
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
            <button
              type="button"
              className="personal-notification-card__hit"
              onClick={() => openEdit(reminder)}
              aria-label={`Abrir ${reminder.title}`}
            >
              <span className="personal-notification-card__icon" aria-hidden>
                <ReminderIcon icon={reminder.icon} />
              </span>
              <span className="personal-notification-card__content">
                <strong>{reminder.title}</strong>
                <small>{summarizePersonalNotificationSchedule(reminder)}</small>
              </span>
            </button>
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
              onClick={() => requestRemove(reminder)}
              disabled={deletingId === reminder.id}
              className="personal-notification-card__action personal-notification-card__action--danger"
              aria-label={`Excluir ${reminder.title}`}
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </article>
        ))}
      </div>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (deletingId) return;
          setPendingDelete(null);
          setSkipConfirmChecked(false);
        }}
        labelledBy="reminder-delete-title"
        describedBy="reminder-delete-desc"
        role="alertdialog"
        autoFocus={false}
        disableDismiss={Boolean(deletingId)}
      >
        <div className="reminder-delete-confirm p-4">
          <h2 id="reminder-delete-title" className="text-base font-extrabold text-stone-800">
            Excluir lembrete?
          </h2>
          <p id="reminder-delete-desc" className="mt-1 text-sm font-semibold text-stone-600">
            Você deixará de receber este aviso.
            {pendingDelete?.title ? (
              <>
                {' '}
                <span className="font-extrabold text-stone-800">“{pendingDelete.title}”</span>
              </>
            ) : null}
          </p>
          <label className="reminder-delete-confirm__skip mt-3 flex items-start gap-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={skipConfirmChecked}
              onChange={(event) => setSkipConfirmChecked(event.target.checked)}
              disabled={Boolean(deletingId)}
            />
            <span>Não perguntar novamente neste dispositivo</span>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <GameButton
              variant="ghost"
              size="sm"
              disabled={Boolean(deletingId)}
              onClick={() => {
                setPendingDelete(null);
                setSkipConfirmChecked(false);
              }}
            >
              Cancelar
            </GameButton>
            <GameButton
              variant="danger"
              size="sm"
              disabled={!pendingDelete || Boolean(deletingId)}
              onClick={() => {
                if (!pendingDelete) return;
                void remove(pendingDelete, { rememberSkip: skipConfirmChecked });
              }}
            >
              Excluir
            </GameButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}
