import { ClashSwordIcon } from '@/components/afk/ClashSwordIcon';

/** Par de espadas que colidem no centro em loop (estilo botão de guerra do
    Clash of Clans) — usado só no FAB de Exploração. */
export function AfkFabSwords() {
  return (
    <span className="game-afk-fab-swords" aria-hidden>
      <ClashSwordIcon className="game-afk-fab-swords__blade game-afk-fab-swords__blade--l" />
      <ClashSwordIcon className="game-afk-fab-swords__blade game-afk-fab-swords__blade--r" />
      <span className="game-afk-fab-swords__spark" />
    </span>
  );
}
