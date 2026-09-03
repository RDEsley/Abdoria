import type { CSSProperties } from 'react';
import {
  AlarmClock,
  BookOpen,
  Check,
  Circle,
  Dumbbell,
  Droplets,
  HeartPulse,
  Leaf,
  Plus,
  ShieldPlus,
  Star,
  X,
} from 'lucide-react';
import {
  PERSONAL_NOTIFICATION_COLORS,
  PERSONAL_NOTIFICATION_ICONS,
  type PersonalNotificationColor,
  type PersonalNotificationIcon,
} from '@shared/reminders';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { ReminderNotificationPreview } from './ReminderNotificationPreview';
import type { RecurrenceDraft } from './reminder-form-types';

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

interface DraftSlice {
  title: string;
  message: string;
  recurrence: RecurrenceDraft;
  onceDate: string;
  times: string[];
  weekdays: number[];
  icon: PersonalNotificationIcon;
  color: PersonalNotificationColor;
}

interface ReminderPersonalizePanelProps {
  draft: DraftSlice;
  onChange: (patch: Partial<DraftSlice>) => void;
}

export function ReminderPersonalizePanel({ draft, onChange }: ReminderPersonalizePanelProps) {
  return (
    <div className="reminder-personalize">
      <ReminderNotificationPreview
        title={draft.title}
        message={draft.message}
        icon={draft.icon}
        color={draft.color}
        recurrence={draft.recurrence}
        times={draft.times}
        onceDate={draft.onceDate}
      />

      {/* Appearance section */}
      <div className="reminder-personalize__panel">
        <fieldset>
          <legend>Ícone</legend>
          <p className="reminder-personalize__legend-hint">
            Aparece na prévia e na notificação quando a plataforma permitir.
          </p>
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
                    onChange({ icon: option.id });
                  }}
                >
                  <Icon size={18} aria-hidden />
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend>Cor de destaque</legend>
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
                  onChange({ color: option.id });
                }}
              >
                {draft.color === option.id && <Check size={14} aria-hidden />}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Extras section */}
      <div className="reminder-personalize__panel">
        <label>
          <span>
            Mensagem <small>opcional</small>
          </span>
          <textarea
            value={draft.message}
            maxLength={160}
            rows={2}
            placeholder="Adicione um contexto curto"
            onChange={(event) => onChange({ message: event.target.value })}
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
                onClick={() => onChange({ times: [...draft.times, ''] })}
              >
                <Plus size={15} aria-hidden /> Adicionar horário
              </button>
            </div>
          </fieldset>
        )}
      </div>
    </div>
  );
}
