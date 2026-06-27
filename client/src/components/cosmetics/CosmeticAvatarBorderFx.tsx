interface Props {
  borderId: string;
}

const FLAME_COUNT = 4;

/** Chamas discretas apenas na borda do avatar. */
export function CosmeticAvatarBorderFx({ borderId }: Props) {
  const key = borderId.replace('borda_', '');

  if (key !== 'fogo') return null;

  return (
    <div className="game-avatar-border-fx game-avatar-border-fx--fogo" aria-hidden>
      {Array.from({ length: FLAME_COUNT }, (_, i) => (
        <span key={`flame-${i}`} className="game-avatar-border-fx__flame-mount" data-i={i}>
          <span className="game-avatar-border-fx__flame" />
        </span>
      ))}
    </div>
  );
}
