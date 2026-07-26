import { ArrowRight } from 'lucide-react';

interface Props {
  bestiaryUnlocked: number;
  bestiaryTotal: number;
  onOpenShop: () => void;
  onOpenBestiary: () => void;
  onContinue: () => void;
}

/**
 * Cena de hub entre patrulhas: a vila. Cenário é a imagem `vila-background`
 * (céu, montanhas, floresta, grama sobre terra estilo Terraria, casinhas e
 * árvores já pintadas) — a loja e o museu (bestiário) ficam sobrepostos
 * exatamente em cima dos recortes tracejados da própria arte, ambos
 * clicáveis. Sem personagem em cena: a vila é só o hub de navegação, o
 * herói só aparece de verdade na exploração.
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
      </div>

      <button type="button" className="game-afk-village__continue" onClick={onContinue}>
        Explorar Floresta
        <ArrowRight size={16} aria-hidden />
      </button>
    </div>
  );
}
