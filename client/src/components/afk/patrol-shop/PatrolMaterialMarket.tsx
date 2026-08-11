import { Coins, PackageOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SlimeMaterialStockItem } from '@/types';

export type MaterialTierFilter = 'all' | 'common' | 'elite' | 'boss';

interface Props {
  materials: SlimeMaterialStockItem[];
  busyId: string | null;
  onSell: (item: SlimeMaterialStockItem, quantity: number | 'all') => void;
  onSellBulk: (tier: MaterialTierFilter) => void;
}

const TIER_LABEL = {
  common: 'Comum',
  elite: 'Elite',
  boss: 'Chefe',
} as const;

const FILTERS: readonly { id: MaterialTierFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'common', label: 'Comum' },
  { id: 'elite', label: 'Elite' },
  { id: 'boss', label: 'Chefe' },
];

export function PatrolMaterialMarket({ materials, busyId, onSell, onSellBulk }: Props) {
  const [tierFilter, setTierFilter] = useState<MaterialTierFilter>('all');
  const stocked = materials.filter((material) => material.quantity > 0);
  const bulkSummary = useMemo(
    () =>
      stocked
        .filter((material) => tierFilter === 'all' || material.tier === tierFilter)
        .reduce(
          (total, material) => ({
            items: total.items + material.quantity,
            coins: total.coins + material.quantity * material.sellPrice,
          }),
          { items: 0, coins: 0 },
        ),
    [stocked, tierFilter],
  );

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
    <div className="game-patrol-materials" aria-label="Materiais disponíveis para venda">
      <section className="game-patrol-materials__bulk" aria-labelledby="bulk-sale-title">
        <div>
          <strong id="bulk-sale-title">Venda em lote</strong>
          <small>Venda apenas a raridade selecionada.</small>
        </div>
        <div
          className="game-patrol-materials__filters"
          role="group"
          aria-label="Raridade para venda"
        >
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={tierFilter === filter.id ? 'is-active' : ''}
              aria-pressed={tierFilter === filter.id}
              onClick={() => setTierFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="game-patrol-materials__bulk-action"
          disabled={busyId !== null || bulkSummary.items === 0}
          onClick={() => onSellBulk(tierFilter)}
        >
          <Coins size={15} aria-hidden />
          {busyId === 'bulk'
            ? 'Vendendo…'
            : `Vender ${bulkSummary.items} itens · +${bulkSummary.coins}`}
        </button>
      </section>
      <div className="game-patrol-materials__list" role="list">
        {stocked.map((material) => {
          const busy = busyId === material.id;
          const locked = busyId !== null;
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
                  disabled={locked}
                  onClick={() => onSell(material, 1)}
                  aria-label={`Vender uma unidade de ${material.name}`}
                >
                  {busy ? 'Vendendo…' : 'Vender 1'}
                </button>
                {material.quantity > 1 ? (
                  <button
                    type="button"
                    className="game-patrol-material__sell-all"
                    disabled={locked}
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
    </div>
  );
}
