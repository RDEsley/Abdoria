import { Coins, Crown, Gift, Sparkles, Zap } from 'lucide-react';
import {
  DoriaBagIcon,
  FrozenStreakIcon,
  ExpInstantIcon,
  RouteDrinkIcon,
} from '@/lib/daily-shop-display';
import { PatrolBowIcon } from '@/components/afk/patrol-shop/PatrolWeaponIcons';
import type { BestiaryDropEntry } from '@/lib/api';

function BestiaryDropIcon({ dropId, size = 14 }: { dropId: string; size?: number }) {
  switch (dropId) {
    case 'xp':
      return <Zap size={size} aria-hidden />;
    case 'abdoria':
    case 'abdoria_golden':
      return <Coins size={size} aria-hidden />;
    case 'doria_bag':
      return <DoriaBagIcon size={size} />;
    case 'exp_instant':
      return <ExpInstantIcon size={size} />;
    case 'frozen_streak':
      return <FrozenStreakIcon size={size} />;
    case 'route_drink':
      return <RouteDrinkIcon size={size} />;
    case 'cosmetic_legendary':
      return <Sparkles size={size} aria-hidden />;
    case 'cosmetic_secret':
      return <Gift size={size} aria-hidden />;
    case 'titulo_secreto':
      return <Crown size={size} aria-hidden />;
    case 'weapon_legendary':
      return <PatrolBowIcon className="game-bestiary-drop__weapon-icon" variant="arco_09" />;
    case 'weapon_secret':
      return <PatrolBowIcon className="game-bestiary-drop__weapon-icon" variant="arco_10" />;
    default:
      return <Gift size={size} aria-hidden />;
  }
}

interface Props {
  drops: BestiaryDropEntry[];
}

export function BestiaryDropList({ drops }: Props) {
  if (drops.length === 0) return null;

  return (
    <div className="game-bestiary-drops">
      <p className="game-bestiary-drops__title">Drops possíveis</p>
      <ul className="game-bestiary-drops__list">
        {drops.map((drop) => (
          <li
            key={drop.id}
            className={`game-bestiary-drop${drop.descoberto ? ' game-bestiary-drop--revealed' : ' game-bestiary-drop--hidden'}`}
          >
            <span className="game-bestiary-drop__icon" aria-hidden>
              <BestiaryDropIcon dropId={drop.id} />
            </span>
            <span className="game-bestiary-drop__label">{drop.descoberto && drop.label ? drop.label : '???'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
