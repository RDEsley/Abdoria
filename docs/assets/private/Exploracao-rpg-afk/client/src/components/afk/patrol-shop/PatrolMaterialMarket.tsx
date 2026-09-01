import { Coins, PackageOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SlimeMaterialRarity, SlimeMaterialStockItem } from '@/types';

export type MaterialRarityFilter = SlimeMaterialRarity | 'all';

interface Props {
  materials: SlimeMaterialStockItem[];
  busyId: string | null;
  onSell: (item: SlimeMaterialStockItem, quantity: number | 'all') => void;
  onSellBulk: (rarity: MaterialRarityFilter) => void;
}

const RARITY_LABEL: Record<SlimeMaterialRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  mitico: 'Mítico',
} as const;

const FILTERS: readonly { id: MaterialRarityFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'comum', label: 'Comum' },
  { id: 'raro', label: 'Raro' },
  { id: 'epico', label: 'Épico' },
  { id: 'mitico', label: 'Mítico' },
];

export function PatrolMaterialMarket({ materials, busyId, onSell, onSellBulk }: Props) {
  const [rarityFilter, setRarityFilter] = useState<MaterialRarityFilter>('all');
  const stocked = materials.filter((material) => material.quantity > 0);
  const bulkSummary = useMemo(
    () =>
      stocked
        .filter((material) => rarityFilter === 'all' || material.rarity === rarityFilter)
        .reduce(
          (total, material) => ({
            items: total.items + material.quantity,
            coins: total.coins + material.quantity * material.sellPrice,
          }),
          { items: 0, coins: 0 },
        ),
    [stocked, rarityFilter],
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
              className={rarityFilter === filter.id ? 'is-active' : ''}
              aria-pressed={rarityFilter === filter.id}
              onClick={() => setRarityFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="game-patrol-materials__bulk-action"
          disabled={busyId !== null || bulkSummary.items === 0}
          onClick={() => onSellBulk(rarityFilter)}
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
              className={`game-patrol-material game-patrol-material--${material.tier} game-patrol-material--rarity-${material.rarity}`}
              role="listitem"
            >
              <span className="game-patrol-material__icon" aria-hidden>
                {material.icon}
              </span>
              <div className="game-patrol-material__content">
                <span className="game-patrol-material__tier">{RARITY_LABEL[material.rarity]}</span>
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
