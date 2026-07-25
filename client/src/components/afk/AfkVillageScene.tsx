import { ArrowRight } from 'lucide-react';

interface Props {
  bestiaryUnlocked: number;
  bestiaryTotal: number;
  onOpenShop: () => void;
  onOpenBestiary: () => void;
  onContinue: () => void;
}

/** Casinha decorativa (só CSS) que preenche a vila sem competir com a loja
    e o museu — puramente cenário, não é clicável. */
function VillageHouse({ className }: { className: string }) {
  return (
    <div className={`game-afk-village__house ${className}`} aria-hidden>
      <span className="game-afk-village__house-roof" />
      <span className="game-afk-village__house-body">
        <span className="game-afk-village__house-window" />
        <span className="game-afk-village__house-door" />
      </span>
    </div>
  );
}

/**
 * Cena de hub entre patrulhas: a vila. Cenário 100% CSS (céu com sol/nuvens,
 * colinas, grama sobre terra estilo Terraria, casinhas e árvores de fundo)
 * com a loja e o museu (bestiário) sobrepostos bem em cima da linha
 * céu/grama — como construções assentadas na superfície — ambos clicáveis,
 * cada um com uma placa de nome por cima. Sem personagem em cena: a vila é
 * só o hub de navegação, o herói só aparece de verdade na exploração.
 */
export function AfkVillageScene({
  bestiaryUnlocked,
  bestiaryTotal,
  onOpenShop,
  onOpenBestiary,
  onContinue,
}: Props) {
  return (
    <div className="game-afk-scene">
      <div className="game-afk-scene__viewport game-afk-village">
        <div className="game-afk-village__sun" aria-hidden />
        <div className="game-afk-village__cloud game-afk-village__cloud--1" aria-hidden />
        <div className="game-afk-village__cloud game-afk-village__cloud--2" aria-hidden />
        <div className="game-afk-village__cloud game-afk-village__cloud--3" aria-hidden />
        <div className="game-afk-village__grass" aria-hidden />

        <VillageHouse className="game-afk-village__house--1" />
        <VillageHouse className="game-afk-village__house--2" />
        <VillageHouse className="game-afk-village__house--3" />
        <div className="game-afk-village__tree game-afk-village__tree--1" aria-hidden />
        <div className="game-afk-village__tree game-afk-village__tree--2" aria-hidden />

        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--shop"
          onClick={onOpenShop}
          aria-label="Abrir loja da Exploração"
          title="Loja"
        >
          <span className="game-afk-village__building-label">Loja</span>
          <div className="game-afk-village__building-shadow" aria-hidden />
          <img src="/assets/loja-da-vila.png" alt="" draggable={false} />
        </button>

        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--museu"
          onClick={onOpenBestiary}
          aria-label="Abrir Bestiário"
          title="Bestiário"
        >
          <span className="game-afk-village__building-label">Bestiário</span>
          <div className="game-afk-village__building-shadow" aria-hidden />
          <img src="/assets/museu-da-vila-bestiario.png" alt="" draggable={false} />
          <span className="game-afk-village__building-count tabular-nums">
            {bestiaryUnlocked}/{bestiaryTotal}
          </span>
        </button>

        <button type="button" className="game-afk-village__continue" onClick={onContinue}>
          Explorar
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
