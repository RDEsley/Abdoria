import { Check, Coins, Lock, Sparkles, Swords } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { PATROL_WEAPON_RARITY_LABELS, type PatrolShopCatalogItem } from '@/types';

interface Props {
  item: PatrolShopCatalogItem;
  busy: boolean;
  onEquip: () => void;
  onPurchase: () => void;
}

function rarityFrameClass(raridade: PatrolShopCatalogItem['raridade']) {
  return `game-patrol-shop-row--${raridade}`;
}

function WeaponThumb({ item }: { item: PatrolShopCatalogItem }) {
  const tier =
    item.raridade === 'lendario' || item.raridade === 'epico'
      ? 'epic'
      : item.raridade === 'raro'
        ? 'rare'
        : item.desbloqueada
          ? 'owned'
          : 'basic';

  return (
    <div className={`game-patrol-shop-row__thumb game-patrol-shop-row__thumb--${item.kind} game-patrol-shop-row__thumb--${tier}`}>
      {item.kind === 'arco' ? (
        <svg viewBox="0 0 40 28" className="game-patrol-shop-row__thumb-svg" aria-hidden>
          <path d="M6 24 C6 8, 34 8, 34 24" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <line x1="6" y1="24" x2="34" y2="24" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 28 36" className="game-patrol-shop-row__thumb-svg" aria-hidden>
          <path d="M14 3 L14 26" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8 24 L20 24 L14 32 Z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}

export function PatrolShopItemRow({ item, busy, onEquip, onPurchase }: Props) {
  return (
    <article
      className={`game-patrol-shop-row ${rarityFrameClass(item.raridade)} ${item.equipada ? 'game-patrol-shop-row--equipped' : ''} ${item.futuro ? 'game-patrol-shop-row--future' : ''} ${!item.desbloqueada && !item.futuro ? 'game-patrol-shop-row--locked' : ''}`}
    >
      <div className="game-patrol-shop-row__thumb-wrap">
        <WeaponThumb item={item} />
        {item.futuro && (
          <span className="game-patrol-shop-row__lock">
            <Lock size={12} />
          </span>
        )}
      </div>

      <div className="game-patrol-shop-row__content">
        <div className="game-patrol-shop-row__head">
          <h4>{item.nome}</h4>
          <span className="game-patrol-shop-row__rarity">{PATROL_WEAPON_RARITY_LABELS[item.raridade]}</span>
        </div>
        <p className="game-patrol-shop-row__desc">{item.descricao}</p>
        <p className="game-patrol-shop-row__stats">
          <Swords size={12} aria-hidden /> Dano: <strong>{item.dano_total}</strong>
          {item.dano_bonus > 0 && <span className="game-patrol-shop-row__bonus">+{item.dano_bonus}</span>}
        </p>
        <p className="game-patrol-shop-row__unlock">
          {item.desbloqueada ? (
            item.equipada ? (
              <span className="game-patrol-shop-row__status game-patrol-shop-row__status--equipped">
                <Check size={12} /> Equipado
              </span>
            ) : (
              <span className="game-patrol-shop-row__status">Desbloqueado</span>
            )
          ) : (
            item.unlock_label
          )}
        </p>
      </div>

      <div className="game-patrol-shop-row__actions">
        {item.desbloqueada ? (
          <GameButton
            size="sm"
            variant={item.equipada ? 'secondary' : 'primary'}
            className="game-patrol-shop-row__btn"
            disabled={item.equipada || busy}
            onClick={onEquip}
          >
            {item.equipada ? 'Em uso' : 'Equipar'}
          </GameButton>
        ) : item.futuro ? (
          <GameButton size="sm" variant="secondary" className="game-patrol-shop-row__btn" disabled>
            <Sparkles size={14} /> Em breve
          </GameButton>
        ) : item.unlock.tipo === 'moedas' ? (
          <GameButton
            size="sm"
            className="game-patrol-shop-row__btn"
            disabled={busy || !item.pode_comprar}
            onClick={onPurchase}
          >
            <Coins size={14} /> {item.unlock.preco_moedas}
          </GameButton>
        ) : (
          <GameButton size="sm" variant="secondary" className="game-patrol-shop-row__btn" disabled>
            Grátis
          </GameButton>
        )}
      </div>
    </article>
  );
}
