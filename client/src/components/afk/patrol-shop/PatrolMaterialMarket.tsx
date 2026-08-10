import { Coins, PackageOpen } from 'lucide-react';
import type { SlimeMaterialStockItem } from '@/types';

interface Props {
  materials: SlimeMaterialStockItem[];
  busyId: string | null;
  onSell: (item: SlimeMaterialStockItem, quantity: number | 'all') => void;
}

const TIER_LABEL = {
  common: 'Comum',
  elite: 'Elite',
  boss: 'Chefe',
} as const;

export function PatrolMaterialMarket({ materials, busyId, onSell }: Props) {
  const stocked = materials.filter((material) => material.quantity > 0);

  if (stocked.length === 0) {
    return (
      <div className="game-patrol-materials__empty">
        <PackageOpen size={28} aria-hidden />
        <strong>Nenhum material na mochila</strong>
        <span>Derrote slimes e colete o baú para trazer materiais até a loja.</span>
      </div>
    );
  }

  return (
    <div
      className="game-patrol-materials"
      role="list"
      aria-label="Materiais disponíveis para venda"
    >
      {stocked.map((material) => {
        const busy = busyId === material.id;
        return (
          <article
            key={material.id}
            className={`game-patrol-material game-patrol-material--${material.tier}`}
            role="listitem"
          >
            <span className="game-patrol-material__icon" aria-hidden>
              {material.icon}
            </span>
            <div className="game-patrol-material__content">
              <span className="game-patrol-material__tier">{TIER_LABEL[material.tier]}</span>
              <strong>{material.name}</strong>
              <small>{material.description}</small>
              <span className="game-patrol-material__price">
                <Coins size={13} aria-hidden /> {material.sellPrice} Coins por unidade
              </span>
            </div>
            <div className="game-patrol-material__stock">
              <span className="tabular-nums">{material.quantity}/99</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSell(material, 1)}
                aria-label={`Vender uma unidade de ${material.name}`}
              >
                {busy ? 'Vendendo…' : 'Vender 1'}
              </button>
              {material.quantity > 1 ? (
                <button
                  type="button"
                  className="game-patrol-material__sell-all"
                  disabled={busy}
                  onClick={() => onSell(material, 'all')}
                  aria-label={`Vender todas as unidades de ${material.name}`}
                >
                  Tudo · +{material.quantity * material.sellPrice}
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
