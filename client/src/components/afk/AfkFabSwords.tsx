import { Sword } from 'lucide-react';

interface Props {
  variant?: 'fab' | 'header';
}

/**
 * Par de espadas que colidem no centro (estilo botão de guerra do Clash of Clans).
 * No FAB a colisão anima em loop; no header fica como par cruzado estático.
 */
export function AfkFabSwords({ variant = 'fab' }: Props) {
  const isHeader = variant === 'header';
  const stroke = isHeader ? 2.1 : 2.25;

  return (
    <span
      className={`game-afk-fab-swords${isHeader ? ' game-afk-fab-swords--header' : ''}`}
      aria-hidden
    >
      <Sword className="game-afk-fab-swords__blade game-afk-fab-swords__blade--l" strokeWidth={stroke} />
      <Sword className="game-afk-fab-swords__blade game-afk-fab-swords__blade--r" strokeWidth={stroke} />
      <span className="game-afk-fab-swords__spark" />
    </span>
  );
}
