import { BowArrow, Sparkles, Sword, Wand2 } from 'lucide-react';
import type { PatrolWeaponKind } from '@/types';

interface Props {
  activeTab: PatrolWeaponKind;
  equippedArcoId: string;
  equippedEspadaId: string;
  celebrating?: boolean;
}

function CounterWeapon({ kind, weaponId }: { kind: 'arco' | 'espada'; weaponId: string }) {
  const tier =
    weaponId.includes('vulcao') || weaponId.includes('dragao')
      ? 'epic'
      : weaponId.includes('elfico') || weaponId.includes('runica')
        ? 'rare'
        : weaponId.includes('caca') || weaponId.includes('ferro')
          ? 'mid'
          : 'basic';

  if (kind === 'arco') {
    return (
      <svg viewBox="0 0 48 32" className={`game-patrol-vendor__weapon game-patrol-vendor__weapon--${tier}`} aria-hidden>
        <path d="M8 28 C8 10, 40 10, 40 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="2" />
        <line x1="24" y1="28" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 40" className={`game-patrol-vendor__weapon game-patrol-vendor__weapon--${tier}`} aria-hidden>
      <path d="M16 4 L16 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 8 L22 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 30 L24 30 L16 38 Z" fill="currentColor" />
    </svg>
  );
}

export function PatrolShopVendor({ activeTab, equippedArcoId, equippedEspadaId, celebrating }: Props) {
  const showWeapon = activeTab === 'arco' || activeTab === 'espada';

  return (
    <div
      className={`game-patrol-vendor${celebrating ? ' game-patrol-vendor--celebrate' : ''}`}
      aria-hidden
    >
      <div className="game-patrol-vendor__backdrop" />
      <div className="game-patrol-vendor__counter">
        <div className="game-patrol-vendor__counter-top" />
        <div className="game-patrol-vendor__counter-front" />
        {showWeapon && (
          <div className="game-patrol-vendor__counter-item">
            <CounterWeapon
              kind={activeTab}
              weaponId={activeTab === 'arco' ? equippedArcoId : equippedEspadaId}
            />
          </div>
        )}
        {activeTab === 'magia' && (
          <div className="game-patrol-vendor__counter-item game-patrol-vendor__counter-item--magic">
            <Wand2 size={28} strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="game-patrol-vendor__npc">
        <div className="game-patrol-vendor__hat" />
        <div className="game-patrol-vendor__face">
          <span className="game-patrol-vendor__eye game-patrol-vendor__eye--l" />
          <span className="game-patrol-vendor__eye game-patrol-vendor__eye--r" />
          <span className="game-patrol-vendor__beard" />
        </div>
        <div className="game-patrol-vendor__body" />
        <div className="game-patrol-vendor__arm game-patrol-vendor__arm--l" />
        <div className="game-patrol-vendor__arm game-patrol-vendor__arm--r" />
      </div>

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
        {activeTab === 'arco' && <BowArrow size={12} aria-hidden />}
        {activeTab === 'espada' && <Sword size={12} aria-hidden />}
        {activeTab === 'magia' && <Wand2 size={12} aria-hidden />}
        <span>
          {activeTab === 'arco' ? 'Arcos' : activeTab === 'espada' ? 'Espadas' : 'Magias'}
        </span>
      </div>
    </div>
  );
}
