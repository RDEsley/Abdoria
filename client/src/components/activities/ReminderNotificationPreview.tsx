import { useId, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { PERSONAL_NOTIFICATION_COLORS, PERSONAL_NOTIFICATION_ICONS } from '@shared/reminders';
import { EVOLYN_NOTIFICATION_ICON } from '@shared/notification-catalog';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { REMINDER_ICON_COMPONENTS } from './reminder-icon-map';
import type { RecurrenceDraft, ReminderDraftSlice } from './reminder-form-types';

type PreviewDraft = Pick<
  ReminderDraftSlice,
  'title' | 'message' | 'icon' | 'color' | 'recurrence' | 'times' | 'onceDate'
>;

interface ReminderNotificationPreviewProps {
  draft: PreviewDraft;
  onChange: (patch: Partial<ReminderDraftSlice>) => void;
  titleInvalid?: boolean;
  errorId?: string;
}

function frequencyLabel(recurrence: RecurrenceDraft, onceDate: string): string {
  if (recurrence === 'once') {
    return onceDate ? `Uma vez · ${onceDate.split('-').reverse().join('/')}` : 'Uma vez';
  }
  if (recurrence === 'daily') return 'Todos os dias';
  return 'Dias específicos';
}

/**
 * Prévia interativa da notificação — é o editor principal do lembrete.
 * Título, mensagem e horário são inputs reais (sem contentEditable); o
 * emblema abre o seletor compacto de ícone/cor. Nunca recebe autofoco: o
 * teclado só aparece quando a pessoa toca num campo de texto.
 */
export function ReminderNotificationPreview({
  draft,
  onChange,
  titleInvalid,
  errorId,
}: ReminderNotificationPreviewProps) {
  const { title, message, icon, color, recurrence, times, onceDate } = draft;
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const appearanceId = useId();
  const accent = PERSONAL_NOTIFICATION_COLORS.find((entry) => entry.id === color)?.hex ?? '#64748b';
  const BadgeIcon = REMINDER_ICON_COMPONENTS[icon];

  const toggleAppearance = () => {
    void selectionHaptic();
    setAppearanceOpen((value) => !value);
  };

  return (
    <div className="reminder-preview" style={{ '--reminder-accent': accent } as CSSProperties}>
      <p className="reminder-preview__label">
        Prévia <span className="reminder-preview__label-hint">· toque para editar</span>
      </p>

      <div className="reminder-preview__card">
        <button
          type="button"
          className="reminder-preview__avatar"
          aria-haspopup="true"
          aria-expanded={appearanceOpen}
          aria-controls={appearanceId}
          aria-label="Escolher ícone e cor de destaque"
          onClick={toggleAppearance}
        >
          <img src={EVOLYN_NOTIFICATION_ICON} alt="" width={40} height={40} />
          <span className="reminder-preview__badge">
            <BadgeIcon size={11} aria-hidden />
          </span>
        </button>

        <div className="reminder-preview__copy">
          <input
            type="text"
            className="reminder-preview__title-input"
            value={title}
            maxLength={60}
            placeholder="Seu lembrete"
            aria-label="Título do lembrete"
            aria-invalid={titleInvalid || undefined}
            aria-describedby={errorId}
            onChange={(event) => onChange({ title: event.target.value })}
          />
          <textarea
            className="reminder-preview__message-input"
            value={message}
            maxLength={160}
            rows={2}
            placeholder="Uma mensagem curta aparece aqui."
            aria-label="Mensagem do lembrete (opcional)"
            onChange={(event) => onChange({ message: event.target.value })}
          />
          <div className="reminder-preview__meta-row">
            <span className="reminder-preview__freq">{frequencyLabel(recurrence, onceDate)}</span>
            <input
              type="time"
              className="reminder-preview__time-input"
              value={times[0] ?? ''}
              aria-label="Horário do lembrete"
              onChange={(event) => onChange({ times: [event.target.value, ...times.slice(1)] })}
            />
          </div>
        </div>
      </div>

      {appearanceOpen && (
        <div className="reminder-preview__appearance" id={appearanceId}>
          <div className="reminder-preview__icon-grid" role="group" aria-label="Ícone">
            {PERSONAL_NOTIFICATION_ICONS.map((option) => {
              const Icon = REMINDER_ICON_COMPONENTS[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={icon === option.id}
                  onClick={() => {
                    void selectionHaptic();
                    onChange({ icon: option.id });
                  }}
                >
                  <Icon size={16} aria-hidden />
                </button>
              );
            })}
          </div>
          <div className="reminder-preview__color-row" role="group" aria-label="Cor de destaque">
            {PERSONAL_NOTIFICATION_COLORS.map((option) => (
              <button
                key={option.id}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={color === option.id}
                style={{ '--notification-color': option.hex } as CSSProperties}
                onClick={() => {
                  void selectionHaptic();
                  onChange({ color: option.id });
                }}
              >
                {color === option.id && <Check size={11} aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
