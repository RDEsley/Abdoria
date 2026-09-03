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

  return (
    <div className="reminder-sound-picker" role="dialog" aria-label="Som do lembrete">
      {SPECIAL.map((option) => (
        <button
          key={option.id}
          type="button"
          className={value === option.id ? 'is-selected' : ''}
          onClick={() => {
            void selectionHaptic();
            onChange(option.id);
            onClose();
          }}
        >
          <strong>
            {option.id === 'silent' ? <VolumeX size={14} /> : option.id === 'random' ? <Shuffle size={14} /> : <Volume2 size={14} />}{' '}
            {reminderSoundLabel(option.id)}
          </strong>
          <small>{option.hint}</small>
        </button>
      ))}
      {unlocked.map((item) => (
        <button
          key={item.id}
          type="button"
          className={value === item.id ? 'is-selected' : ''}
          onClick={() => {
            void selectionHaptic();
            onChange(item.id as ReminderSoundId);
            previewSfxPack(item.id);
            onClose();
          }}
        >
          <strong>{item.nome}</strong>
          <small>{item.descricao}</small>
        </button>
      ))}
      {locked.map((item) => (
        <button key={item.id} type="button" className="is-locked" disabled>
          <strong>{item.nome}</strong>
          <small>Disponível na loja Evolyn</small>
        </button>
      ))}
    </div>
  );
}
