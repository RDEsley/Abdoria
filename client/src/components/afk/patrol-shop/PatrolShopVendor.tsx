import { Sparkles, Wand2 } from 'lucide-react';
import type { PatrolWeaponKind } from '@/types';
import { PatrolBowTabIcon, PatrolSwordTabIcon } from '@/components/afk/patrol-shop/PatrolWeaponIcons';

const VENDOR_ART_SRC = '/assets/patrol-shop-vendor.png';

interface Props {
  activeTab: PatrolWeaponKind;
  celebrating?: boolean;
}

export function PatrolShopVendor({ activeTab, celebrating }: Props) {
  return (
    <div
      className={`game-patrol-vendor${celebrating ? ' game-patrol-vendor--celebrate' : ''}`}
      aria-hidden
    >
      <img
        src={VENDOR_ART_SRC}
        alt=""
        className="game-patrol-vendor__art"
        draggable={false}
      />
      <div className="game-patrol-vendor__shade" />

      {celebrating && (
        <>
          <span className="game-patrol-vendor__coin game-patrol-vendor__coin--1" />
          <span className="game-patrol-vendor__coin game-patrol-vendor__coin--2" />
          <span className="game-patrol-vendor__coin game-patrol-vendor__coin--3" />
          <span className="game-patrol-vendor__sparkle">
            <Sparkles size={16} />
          </span>
        </>
      )}

      <div className="game-patrol-vendor__sign">
        {activeTab === 'arco' && <PatrolBowTabIcon className="game-patrol-vendor__sign-icon" />}
        {activeTab === 'espada' && <PatrolSwordTabIcon className="game-patrol-vendor__sign-icon" />}
        {activeTab === 'magia' && <Wand2 size={12} aria-hidden />}
        <span>
          {activeTab === 'arco' ? 'Arcos' : activeTab === 'espada' ? 'Espadas' : 'Magias'}
        </span>
      </div>
    </div>
  );
}
