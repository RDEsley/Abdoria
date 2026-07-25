import {
  Bomb,
  CircleDot,
  Coins,
  Droplets,
  Flame,
  Lock,
  Mountain,
  Radiation,
  Snowflake,
  Sparkles,
  Swords,
  Target,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import {
  PatrolBowIcon,
  PatrolSwordIcon,
  patrolWeaponIconStyle,
} from '@/components/afk/patrol-shop/PatrolWeaponIcons';
import {
  PATROL_WEAPON_RARITY_LABELS,
  formatPatrolCritChancePercent,
  type PatrolShopCatalogItem,
} from '@/types';
import { SPELL_RARE_DROP_MULTIPLIER } from '@shared/patrol/shop';

interface Props {
  item: PatrolShopCatalogItem;
  busy: boolean;
  onEquip: () => void;
  onPurchase: () => void;
}

function rarityFrameClass(raridade: PatrolShopCatalogItem['raridade']) {
  return `game-patrol-shop-row--${raridade}`;
}

const SPELL_ICONS: Record<string, LucideIcon> = {
  magia_agua: Droplets,
  magia_terra: Mountain,
  magia_gelo: Snowflake,
  magia_fogo: Flame,
  magia_relampago: Zap,
  magia_buraco_negro: CircleDot,
  magia_raio_laser: Radiation,
  magia_explosao: Bomb,
};

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
    <div
      className={`game-patrol-shop-row__thumb game-patrol-shop-row__thumb--${item.kind} game-patrol-shop-row__thumb--${tier}`}
    >
      {item.kind === 'arco' ? (
        <PatrolBowIcon
          className="game-patrol-shop-row__thumb-svg"
          variant={item.id}
          style={patrolWeaponIconStyle('arco', item.id)}
        />
      ) : item.kind === 'espada' ? (
        <PatrolSwordIcon
          className="game-patrol-shop-row__thumb-svg"
          variant={item.id}
          style={patrolWeaponIconStyle('espada', item.id)}
        />
      ) : (
        <span className={`game-patrol-spell-orb game-patrol-spell-orb--${item.id}`} aria-hidden>
          {(() => {
            const SpellIcon = SPELL_ICONS[item.id] ?? Sparkles;
            return <SpellIcon size={22} strokeWidth={2.2} />;
          })()}
        </span>
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
          <div className="game-patrol-shop-row__title-wrap">
            <span className="game-patrol-shop-row__level">Nv. {item.nivel}</span>
            <h4>{item.nome}</h4>
          </div>
          <span
            className={`game-patrol-shop-row__rarity game-patrol-shop-row__rarity--${item.raridade}`}
          >
            {PATROL_WEAPON_RARITY_LABELS[item.raridade]}
          </span>
        </div>
        <p className="game-patrol-shop-row__desc">{item.descricao}</p>
        <div className="game-patrol-shop-row__meta">
          <span className="game-patrol-shop-row__stat-pill game-patrol-shop-row__stat-pill--damage">
            <Swords size={11} aria-hidden />
            {item.nivel === 10 ? (
              <>
                Hit Kill <span className="game-patrol-shop-row__stat-note">comuns</span>
              </>
            ) : (
              <>{item.dano_total} dano</>
            )}
          </span>
          {(item.kind === 'arco' || item.kind === 'espada') && (
            <span className="game-patrol-shop-row__stat-pill game-patrol-shop-row__stat-pill--crit">
              <Zap size={11} aria-hidden />
              {formatPatrolCritChancePercent(item.chance_critico)} crítico
              {item.kind === 'arco' && (
                <span className="game-patrol-shop-row__stat-note">combo +4/hit</span>
              )}
              {item.kind === 'espada' && (
                <span className="game-patrol-shop-row__stat-note">+25 dano</span>
              )}
            </span>
          )}
          {item.kind === 'magia' && SPELL_RARE_DROP_MULTIPLIER[item.raridade] && (
            <span className="game-patrol-shop-row__stat-pill game-patrol-shop-row__stat-pill--drop">
              <Target size={11} aria-hidden />+
              {Math.round((SPELL_RARE_DROP_MULTIPLIER[item.raridade]! - 1) * 100)}% Chance de Drop
            </span>
          )}
        </div>
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
