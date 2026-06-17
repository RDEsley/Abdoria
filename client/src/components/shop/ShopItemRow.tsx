import { Check, Coins, Eye, Lock, Sparkles } from 'lucide-react';
import { CosmeticIcon } from '@/components/cosmetics/CosmeticIcon';
import { GameButton } from '@/components/ui/GameButton';
import { COSMETIC_RARITY_LABELS, type ShopCatalogItem } from '@/types';

interface Props {
  item: ShopCatalogItem;
  letter: string;
  busy: boolean;
  isPreviewing: boolean;
  onPreview: () => void;
  onEquip: () => void;
  onPurchase: () => void;
}

function rarityFrameClass(raridade: ShopCatalogItem['raridade']) {
  return `game-shop-row--${raridade}`;
}

function ItemThumb({ item, letter }: { item: ShopCatalogItem; letter: string }) {
  if (item.kind === 'borda') {
    return (
      <div className={`game-shop-row__thumb-ring game-cosmetic-avatar--border-${item.id.replace('borda_', '')}`}>
        <span className="game-shop-row__thumb-dot" />
      </div>
    );
  }

  return (
    <div className="game-shop-row__thumb-inner game-shop-row__thumb-inner--avatar">
      <CosmeticIcon
        icon={item.icon}
        avatarId={item.id}
        letter={letter}
        size={18}
        unlocked={item.desbloqueada}
      />
    </div>
  );
}

export function ShopItemRow({
  item,
  letter,
  busy,
  isPreviewing,
  onPreview,
  onEquip,
  onPurchase,
}: Props) {
  const canPreview =
    item.desbloqueada ||
    item.kind === 'avatar' ||
    item.kind === 'borda' ||
    item.kind === 'titulo' ||
    item.kind === 'som' ||
    item.kind === 'efeito';

  return (
    <article
      className={`game-shop-row ${rarityFrameClass(item.raridade)} ${item.equipada ? 'game-shop-row--equipped' : ''} ${!item.desbloqueada ? 'game-shop-row--locked' : ''} ${isPreviewing ? 'game-shop-row--previewing' : ''}`}
    >
      <div className="game-shop-row__ornament game-shop-row__ornament--left" aria-hidden />
      <div className="game-shop-row__ornament game-shop-row__ornament--right" aria-hidden />

      <div className="game-shop-row__thumb">
        <ItemThumb item={item} letter={letter} />
        {!item.desbloqueada && (
          <span className="game-shop-row__lock">
            <Lock size={12} />
          </span>
        )}
      </div>

      <div className="game-shop-row__content">
        <div className="game-shop-row__head">
          <h4>{item.nome}</h4>
          <span className="game-shop-row__rarity">{COSMETIC_RARITY_LABELS[item.raridade]}</span>
        </div>
        <p className="game-shop-row__desc">{item.descricao}</p>
        <p className="game-shop-row__unlock">
          {item.desbloqueada ? (
            item.equipada ? (
              <span className="game-shop-row__status game-shop-row__status--equipped">
                <Check size={12} /> Equipado
              </span>
            ) : (
              <span className="game-shop-row__status">Desbloqueado</span>
            )
          ) : (
            item.unlock_label
          )}
        </p>
      </div>

      <div className="game-shop-row__actions">
        {canPreview && (
          <GameButton
            size="sm"
            variant={isPreviewing ? 'primary' : 'secondary'}
            className="game-shop-row__btn"
            disabled={busy}
            onClick={onPreview}
          >
            <Eye size={14} /> {isPreviewing ? 'Na prévia' : 'Prévia'}
          </GameButton>
        )}

        {item.desbloqueada ? (
          <GameButton
            size="sm"
            variant={item.equipada ? 'secondary' : 'primary'}
            className="game-shop-row__btn"
            disabled={item.equipada || busy}
            onClick={onEquip}
          >
            {item.equipada ? 'Em uso' : 'Equipar'}
          </GameButton>
        ) : item.pode_comprar ? (
          <GameButton size="sm" className="game-shop-row__btn" disabled={busy} onClick={onPurchase}>
            <Coins size={14} /> {item.unlock.preco_moedas}
          </GameButton>
        ) : item.unlock.tipo === 'moedas' ? (
          <GameButton size="sm" variant="secondary" className="game-shop-row__btn" disabled>
            <Coins size={14} /> {item.unlock.preco_moedas}
          </GameButton>
        ) : (
          <GameButton size="sm" variant="secondary" className="game-shop-row__btn" disabled>
            <Sparkles size={14} /> Bloqueado
          </GameButton>
        )}
      </div>
    </article>
  );
}
