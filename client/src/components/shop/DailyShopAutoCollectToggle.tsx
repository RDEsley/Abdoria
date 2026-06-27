import { Gift, Loader2, Sparkles } from 'lucide-react';

interface Props {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function DailyShopAutoCollectToggle({ checked, disabled, onToggle }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Coletar recompensa grátis da loja diária automaticamente ao entrar no app"
      disabled={disabled}
      className={`game-daily-autoclaim${checked ? ' game-daily-autoclaim--on' : ''}${disabled ? ' game-daily-autoclaim--busy' : ''}`}
      onClick={onToggle}
    >
      <span className="game-daily-autoclaim__icon" aria-hidden>
        {disabled ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        {checked && !disabled && <Sparkles size={10} className="game-daily-autoclaim__spark" />}
      </span>

      <span className="game-daily-autoclaim__copy">
        <span className="game-daily-autoclaim__title">
          {checked ? 'Coleta automática ativa' : 'Coletar ao entrar'}
        </span>
        <span className="game-daily-autoclaim__hint">
          {checked
            ? 'Seu brinde grátis é resgatado ao abrir o Abdoria'
            : 'Ative para resgatar o brinde grátis sem abrir a loja'}
        </span>
      </span>

      <span className="game-daily-autoclaim__track" aria-hidden>
        <span className="game-daily-autoclaim__thumb" />
      </span>
    </button>
  );
}
