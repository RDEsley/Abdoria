interface Props {
  borderId: string;
}

const FLAME_COUNT = 8;
const EMBER_COUNT = 6;

/** Camadas animadas extras para bordas que precisam de mais do que ::before/::after. */
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
      {Array.from({ length: EMBER_COUNT }, (_, i) => (
        <span key={`ember-${i}`} className="game-avatar-border-fx__ember" data-i={i} />
      ))}
      <span className="game-avatar-border-fx__heat" />
    </div>
  );
}
