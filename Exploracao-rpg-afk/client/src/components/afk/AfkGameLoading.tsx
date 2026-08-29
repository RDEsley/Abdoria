import { AfkFabSwords } from '@/components/afk/AfkFabSwords';

interface Props {
  label?: string;
}

export function AfkGameLoading({ label = 'Preparando sua jornada' }: Props) {
  return (
    <div className="game-afk-loading" role="status" aria-live="polite">
      <div className="game-afk-loading__mist" aria-hidden />
      <div className="game-afk-loading__crest" aria-hidden>
        <span className="game-afk-loading__crest-ring" />
        <AfkFabSwords />
      </div>
      <p className="game-afk-loading__brand">EVOLYN</p>
      <h2 className="game-afk-loading__title">Exploração</h2>
      <p className="game-afk-loading__label">{label}</p>
      <div className="game-afk-loading__bar" aria-hidden>
        <span />
      </div>
      <p className="game-afk-loading__tip">Sua patrulha continua lutando mesmo quando você sai.</p>
    </div>
  );
}
