import { Sparkles } from 'lucide-react';

const VENDOR_ART_SRC = '/assets/patrol-shop-vendor.png';

interface Props {
  celebrating?: boolean;
}

export function PatrolShopVendor({ celebrating }: Props) {
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

    </div>
  );
}
