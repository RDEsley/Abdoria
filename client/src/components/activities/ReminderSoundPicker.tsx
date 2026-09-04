import { Volume2, VolumeX, Shuffle } from 'lucide-react';
import { COSMETICS } from '@shared/cosmetics';
import {
  reminderSoundLabel,
  type ReminderSoundId,
} from '@shared/reminder-sounds';
import { previewSfxPack } from '@/lib/sounds';
import { selectionHaptic } from '@/lib/platform/native-runtime';

const SPECIAL: Array<{ id: ReminderSoundId; hint: string }> = [
  { id: 'app_default', hint: 'Som padrão das notificações do Evolyn.' },
  { id: 'random', hint: 'Um som desbloqueado, estável por horário.' },
  { id: 'silent', hint: 'Canal sem som.' },
];

export function ReminderSoundPicker({
  value,
  unlockedPacks,
  onChange,
  onClose,
}: {
  value: ReminderSoundId;
  unlockedPacks: string[];
  onChange: (sound: ReminderSoundId) => void;
  onClose: () => void;
}) {
  const packs = COSMETICS.filter((item) => item.kind === 'som');
  const unlocked = packs.filter((item) => unlockedPacks.includes(item.id));
  const locked = packs.filter((item) => !unlockedPacks.includes(item.id));

  const pick = (id: ReminderSoundId, preview?: string) => {
    void selectionHaptic();
    onChange(id);
    if (preview) previewSfxPack(preview);
    onClose();
  };

  return (
    <div className="reminder-sound-picker" role="listbox" aria-label="Som do lembrete">
      {SPECIAL.map((option) => (
        <button
          key={option.id}
          type="button"
          role="option"
          aria-selected={value === option.id}
          className={`reminder-sound-picker__row${value === option.id ? ' is-selected' : ''}`}
          onClick={() => pick(option.id)}
        >
          <span className="reminder-sound-picker__icon" aria-hidden>
            {option.id === 'silent' ? (
              <VolumeX size={14} />
            ) : option.id === 'random' ? (
              <Shuffle size={14} />
            ) : (
              <Volume2 size={14} />
            )}
          </span>
          <span className="reminder-sound-picker__copy">
            <strong>{reminderSoundLabel(option.id)}</strong>
            <small>{option.hint}</small>
          </span>
        </button>
      ))}
      {unlocked.map((item) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={value === item.id}
          className={`reminder-sound-picker__row${value === item.id ? ' is-selected' : ''}`}
          onClick={() => pick(item.id as ReminderSoundId, item.id)}
        >
          <span className="reminder-sound-picker__icon" aria-hidden>
            <Volume2 size={14} />
          </span>
          <span className="reminder-sound-picker__copy">
            <strong>{item.nome}</strong>
            <small>{item.descricao}</small>
          </span>
        </button>
      ))}
      {locked.map((item) => (
        <button
          key={item.id}
          type="button"
          className="reminder-sound-picker__row is-locked"
          disabled
        >
          <span className="reminder-sound-picker__icon" aria-hidden>
            <Volume2 size={14} />
          </span>
          <span className="reminder-sound-picker__copy">
            <strong>{item.nome}</strong>
            <small>Disponível na loja Evolyn</small>
          </span>
        </button>
      ))}
    </div>
  );
}
