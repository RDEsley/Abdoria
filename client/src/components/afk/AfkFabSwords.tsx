import { ClashSwordIcon } from '@/components/afk/ClashSwordIcon';

interface Props {
  variant?: 'fab' | 'header';
}

/**
 * Par de espadas que colidem no centro (estilo botão de guerra do Clash of Clans).
 * No FAB a colisão anima em loop; no header fica como par cruzado estático.
 */
export function AfkFabSwords({ variant = 'fab' }: Props) {
  const isHeader = variant === 'header';

  return (
    <span
      className={`game-afk-fab-swords${isHeader ? ' game-afk-fab-swords--header' : ''}`}
      aria-hidden
    >
      <ClashSwordIcon className="game-afk-fab-swords__blade game-afk-fab-swords__blade--l" />
      <ClashSwordIcon className="game-afk-fab-swords__blade game-afk-fab-swords__blade--r" />
      <span className="game-afk-fab-swords__spark" />
    </span>
  );
}
