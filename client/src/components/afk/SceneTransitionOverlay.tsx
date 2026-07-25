const NBSP = ' ';

interface Props {
  label: string;
}

/** Transição breve entre vila e floresta — texto letra a letra com "bounce",
    estilo tela de carregamento de jogo 2D. */
export function SceneTransitionOverlay({ label }: Props) {
  return (
    <div className="game-scene-transition" role="status" aria-live="polite">
      <div className="game-scene-transition__text">
        {label.split('').map((char, i) => (
          <span
            key={i}
            className="game-scene-transition__letter"
            style={{ animationDelay: `${i * 0.035}s` }}
          >
            {char === ' ' ? NBSP : char}
          </span>
        ))}
      </div>
    </div>
  );
}
