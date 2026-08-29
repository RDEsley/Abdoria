import { useMemo, useState } from 'react';
import { Bell, BellRing, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import {
  REMINDER_SKINS,
  normalizeReminderWeekdays,
  type PersonalizedReminder,
  type ReminderSkin,
} from '@shared/reminders';

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function ReminderCenter() {
  const { user } = useAuth();
  const { patchPreferences } = useUserPreferences();
  const reminders = useMemo(
    () => user?.preferencias?.lembretes_personalizados ?? [],
    [user?.preferencias?.lembretes_personalizados],
  );
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('Hora de cuidar de você');
  const [message, setMessage] = useState('Uma pequena ação hoje mantém sua evolução em movimento.');
  const [time, setTime] = useState('19:00');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [skin, setSkin] = useState<ReminderSkin>('nature');

  const save = async () => {
    if (!title.trim() || weekdays.length === 0) return;
    const reminder: PersonalizedReminder = {
      id: crypto.randomUUID(),
      title: title.trim(),
      message: message.trim(),
      time,
      weekdays: normalizeReminderWeekdays(weekdays),
      skin,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await patchPreferences({ lembretes_personalizados: [...reminders, reminder] });
    setEditing(false);
  };

  const replace = (next: PersonalizedReminder[]) =>
    patchPreferences({ lembretes_personalizados: next });

  const askPermission = () => void notificationScheduler.requestPermission();

  return (
    <section className="glass-card overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="game-section-title flex items-center gap-2">
            <BellRing size={16} /> Notificações programadas
          </h2>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-stone-500">
            Crie alertas pessoais com horário, dias e estilo próprios.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            askPermission();
            setEditing((value) => !value);
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition active:scale-95"
          aria-label="Criar notificação programada"
        >
          <Plus size={19} />
        </button>
      </div>

      {editing && (
        <div className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
          <label className="block text-xs font-extrabold text-stone-700">
            Título
            <input
              value={title}
              maxLength={50}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-xs font-extrabold text-stone-700">
            Mensagem
            <textarea
              value={message}
              maxLength={120}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-xs font-extrabold text-stone-700">
            Horário
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
            />
          </label>
          <div className="flex justify-between gap-1" aria-label="Dias da semana">
            {DAYS.map((day, index) => (
              <button
                key={`${day}-${index}`}
                type="button"
                onClick={() =>
                  setWeekdays((current) =>
                    current.includes(index)
                      ? current.filter((value) => value !== index)
                      : [...current, index],
                  )
                }
                className={`h-9 w-9 rounded-full text-xs font-black transition ${weekdays.includes(index) ? 'bg-emerald-600 text-white' : 'bg-white text-stone-500'}`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {REMINDER_SKINS.map((option) => (
              <button
                key={option.id}
                type="button"
                title={option.description}
                onClick={() => setSkin(option.id)}
                className={`rounded-xl border px-1 py-2 text-center text-lg ${skin === option.id ? 'border-emerald-500 bg-white ring-2 ring-emerald-200' : 'border-transparent bg-white/60'}`}
              >
                <span aria-hidden>{option.emoji}</span>
                <span className="mt-0.5 block text-[0.58rem] font-bold text-stone-600">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 flex-1 rounded-xl bg-white text-sm font-bold text-stone-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="min-h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-black text-white"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {reminders.length === 0 && !editing && (
          <p className="rounded-2xl border border-dashed border-stone-300 px-3 py-5 text-center text-xs font-semibold text-stone-500">
            Nenhuma notificação programada ainda.
          </p>
        )}
        {reminders.map((reminder) => (
          <article
            key={reminder.id}
            className={`reminder-card reminder-card--${reminder.skin} flex items-center gap-3 rounded-2xl border p-3`}
          >
            <Bell size={18} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{reminder.title}</p>
              <p className="text-[0.68rem] font-semibold opacity-70">
                {reminder.time} ·{' '}
                {reminder.weekdays.length === 7
                  ? 'todos os dias'
                  : `${reminder.weekdays.length} dias/semana`}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reminder.enabled}
              onClick={() =>
                void replace(
                  reminders.map((item) =>
                    item.id === reminder.id ? { ...item, enabled: !item.enabled } : item,
                  ),
                )
              }
              className={`h-6 w-11 rounded-full p-0.5 transition ${reminder.enabled ? 'bg-emerald-600' : 'bg-stone-300'}`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition ${reminder.enabled ? 'translate-x-5' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => void replace(reminders.filter((item) => item.id !== reminder.id))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-stone-500"
              aria-label={`Excluir ${reminder.title}`}
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
