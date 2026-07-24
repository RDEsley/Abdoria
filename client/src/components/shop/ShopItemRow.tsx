import { Check, Eye, Lock, Volume2 } from 'lucide-react';
import { CosmeticIcon } from '@/components/cosmetics/CosmeticIcon';
import { GameButton } from '@/components/ui/GameButton';
import { COSMETIC_RARITY_LABELS, type ShopCatalogItem } from '@/types';

interface Props {
  item: ShopCatalogItem;
  busy: boolean;
  isPreviewing?: boolean;
  /** Ausente = sem estágio de prévia (ex.: listas do Editar Perfil). */
  onPreview?: () => void;
  onEquip: () => void;
}

function rarityFrameClass(raridade: ShopCatalogItem['raridade']) {
  return `game-shop-row--${raridade}`;
}

function ItemThumb({ item }: { item: ShopCatalogItem }) {
  if (item.kind === 'banner') {
    return (
      <div
        className={`game-shop-row__thumb-banner game-card-banner--${item.id.replace('fundo_', '')}`}
        aria-hidden
      />
    );
  }

  if (item.kind === 'moldura_loja') {
    return (
      <div
        className={`game-shop-row__thumb-ring game-cosmetic-avatar--border-${item.id.replace('borda_', '')}`}
      >
        <span className="game-shop-row__thumb-dot" />
      </div>
    );
  }

  return <CosmeticIcon icon={item.icon} size={20} unlocked={item.desbloqueada} raridade={item.raridade} />;
}

export function ShopItemRow({ item, busy, isPreviewing = false, onPreview, onEquip }: Props) {
  const canPreview =
    Boolean(onPreview) &&
    (item.desbloqueada ||
      item.kind === 'moldura_loja' ||
      item.kind === 'titulo' ||
      item.kind === 'banner' ||
      item.kind === 'som' ||
      item.kind === 'efeito');

  return (
    <article
      className={`game-shop-row ${rarityFrameClass(item.raridade)} ${item.equipada ? 'game-shop-row--equipped' : ''} ${!item.desbloqueada ? 'game-shop-row--locked' : ''} ${isPreviewing ? 'game-shop-row--previewing' : ''}`}
    >
      <div className="game-shop-row__ornament game-shop-row__ornament--left" aria-hidden />
      <div className="game-shop-row__ornament game-shop-row__ornament--right" aria-hidden />

      <div className="game-shop-row__thumb">
        <ItemThumb item={item} />
        {!item.desbloqueada && (
          <span className="game-shop-row__lock">
            <Lock size={12} />
          </span>
        )}
      </div>

      <div className="game-shop-row__content">
        <div className="game-shop-row__head">
          <h4
            className={
              item.id === 'titulo_dono_do_jogo' ? 'cosmetic-title--dono-do-jogo' : undefined
            }
          >
            {item.nome}
          </h4>
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
            <span className="game-shop-row__unlock-hint game-shop-row__unlock-hint--quest">
              Como conseguir: {item.unlock_label}
            </span>
          )}
        </p>
      </div>

      <div className="game-shop-row__actions">
        {canPreview && (
          <GameButton
            size="sm"
            variant={item.kind === 'som' ? 'secondary' : isPreviewing ? 'primary' : 'secondary'}
            className="game-shop-row__btn"
            disabled={busy}
            onClick={onPreview}
          >
            {item.kind === 'som' ? (
              <>
                <Volume2 size={14} /> Ouvir
              </>
            ) : (
              <>
                <Eye size={14} /> {isPreviewing ? 'Na prévia' : 'Prévia'}
              </>
            )}
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
        ) : (
          <GameButton size="sm" variant="secondary" className="game-shop-row__btn" disabled>
            <Lock size={14} /> Bloqueado
          </GameButton>
        )}
      </div>
    </article>
  );
}
