import { ArrowRight } from 'lucide-react';
import type { PersonagemGenero } from '@/types';

interface Props {
  genero: PersonagemGenero;
  bestiaryUnlocked: number;
  bestiaryTotal: number;
  onOpenShop: () => void;
  onOpenBestiary: () => void;
  onContinue: () => void;
}

/**
 * Cena de hub entre patrulhas: a vila. Cenário 100% CSS (céu + grama, sem
 * imagem de fundo) com a loja e o museu (bestiário) sobrepostos — ambos
 * clicáveis. O personagem fica parado à esquerda (não é combate AFK), só
 * entra em exploração de verdade ao clicar em "Explorar".
 */
export function AfkVillageScene({
  genero,
  bestiaryUnlocked,
  bestiaryTotal,
  onOpenShop,
  onOpenBestiary,
  onContinue,
}: Props) {
  return (
    <div className="game-afk-scene">
      <div className="game-afk-scene__viewport game-afk-village">
        <div className="game-afk-village__ground-shadow" aria-hidden />

        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--shop"
          onClick={onOpenShop}
          aria-label="Abrir loja da Exploração"
          title="Loja"
        >
          <img src="/assets/loja-da-vila.png" alt="" draggable={false} />
        </button>

        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--museu"
          onClick={onOpenBestiary}
          aria-label="Abrir Bestiário"
          title="Bestiário"
        >
          <img src="/assets/museu-da-vila-bestiario.png" alt="" draggable={false} />
          <span className="game-afk-village__building-count tabular-nums">
            {bestiaryUnlocked}/{bestiaryTotal}
          </span>
        </button>

        <div className="game-afk-village__hero">
          <img
            src={
              genero === 'feminino'
                ? '/assets/patrol-mascot-female-village.png'
                : '/assets/patrol-mascot-village.png'
            }
            alt=""
            className="game-afk-village__hero-img"
            draggable={false}
          />
        </div>

        <button type="button" className="game-afk-village__continue" onClick={onContinue}>
          Explorar
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
