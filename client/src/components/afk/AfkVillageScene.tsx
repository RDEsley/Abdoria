import { ArrowRight, BookOpen, Store } from 'lucide-react';
import { AfkMascotHero } from '@/components/afk/AfkMascotHero';
import { AfkSkyCycle } from '@/components/afk/AfkSkyCycle';
import type { ArmaPreferida } from '@/types';

interface Props {
  weapon: ArmaPreferida;
  bestiaryUnlocked: number;
  bestiaryTotal: number;
  onOpenShop: () => void;
  onOpenBestiary: () => void;
  onContinue: () => void;
}

/**
 * Cena de hub entre patrulhas: a vila. Reusa o mesmo cenário de céu/montanhas/
 * árvores da exploração (AfkSkyCycle) pra manter a identidade visual, com a
 * loja e o bestiário como construções clicáveis e um botão claro pra voltar
 * a explorar — o "respiro" entre uma sessão de combate e outra.
 */
export function AfkVillageScene({
  weapon,
  bestiaryUnlocked,
  bestiaryTotal,
  onOpenShop,
  onOpenBestiary,
  onContinue,
}: Props) {
  return (
    <div className="game-afk-scene">
      <div className="game-afk-scene__viewport game-afk-village">
        <AfkSkyCycle showClouds />

        <div className="game-afk-village__banner">
          <span>Vila de Abdoria</span>
        </div>

        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--shop"
          onClick={onOpenShop}
        >
          <span className="game-afk-village__roof" aria-hidden />
          <span className="game-afk-village__stall" aria-hidden>
            <Store size={20} aria-hidden />
          </span>
          <span className="game-afk-village__label">Loja</span>
        </button>

        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--bestiary"
          onClick={onOpenBestiary}
        >
          <span className="game-afk-village__roof game-afk-village__roof--bestiary" aria-hidden />
          <span className="game-afk-village__stall" aria-hidden>
            <BookOpen size={18} aria-hidden />
          </span>
          <span className="game-afk-village__label">
            Bestiário
            <span className="game-afk-village__label-count tabular-nums">
              {bestiaryUnlocked}/{bestiaryTotal}
            </span>
          </span>
        </button>

        <span className="game-afk-village__well" aria-hidden />

        <AfkMascotHero weapon={weapon} attacking={false} attackSeq={0} />

        <button
          type="button"
          className="game-afk-village__continue"
          onClick={onContinue}
        >
          Continuar Explorando
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
