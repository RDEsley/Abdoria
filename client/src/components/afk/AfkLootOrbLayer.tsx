import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AFK_CHEST_RECEIVED_EVENT,
  AFK_CHEST_TARGET_ATTR,
  AFK_LOOT_ORB_EVENT,
  type AfkLootOrbDetail,
} from '@/lib/afk-loot-orbs';

const MAX_ORBS = 6;
const ORB_TRAVEL_SEC = 0.72;
const ORB_STAGGER_SEC = 0.08;

interface OrbSpec {
  id: string;
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  arcDx: number;
  arcDy: number;
  delay: number;
}

let seq = 0;

function resolveChestPoint(): { x: number; y: number } | null {
  const el = document.querySelector(`[${AFK_CHEST_TARGET_ATTR}]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Bolinhas de loot voando do inimigo abatido até o baú do dock. Fica montada
 * junto da tela de Exploração; sem baú visível na tela (ex.: jogador na vila)
 * o evento é ignorado, então nada anima "pro vazio".
 */
export function AfkLootOrbLayer() {
  const [orbs, setOrbs] = useState<OrbSpec[]>([]);

  useEffect(() => {
    const onLoot = (event: Event) => {
      const detail = (event as CustomEvent<AfkLootOrbDetail>).detail;
      const count = Math.min(MAX_ORBS, detail?.count ?? 0);
      if (count <= 0) return;

      const target = resolveChestPoint();
      if (!target) return;

      const origin = detail.originRect
        ? {
            x: detail.originRect.left + detail.originRect.width / 2,
            y: detail.originRect.top + detail.originRect.height / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      const spawned: OrbSpec[] = [];
      for (let i = 0; i < count; i += 1) {
        seq += 1;
        spawned.push({
          id: `afk-loot-orb-${seq}`,
          originX: origin.x + (Math.random() - 0.5) * 30,
          originY: origin.y + (Math.random() - 0.5) * 22,
          dx: target.x - origin.x,
          dy: target.y - origin.y,
          // Sobe antes de descer pro baú — dá o arco de "item pulando" em vez
          // de uma reta seca.
          arcDx: (Math.random() - 0.5) * 54,
          arcDy: -Math.abs(42 + Math.random() * 38),
          delay: i * ORB_STAGGER_SEC,
        });
      }
      setOrbs((prev) => [...prev, ...spawned]);
    };

    window.addEventListener(AFK_LOOT_ORB_EVENT, onLoot);
    return () => window.removeEventListener(AFK_LOOT_ORB_EVENT, onLoot);
  }, []);

  const handleArrive = (orb: OrbSpec) => {
    window.dispatchEvent(new CustomEvent(AFK_CHEST_RECEIVED_EVENT));
    setOrbs((prev) => prev.filter((o) => o.id !== orb.id));
  };

  if (orbs.length === 0) return null;

  return createPortal(
    <div className="game-afk-loot-orb-layer" aria-hidden>
      <AnimatePresence>
        {orbs.map((orb) => (
          <motion.span
            key={orb.id}
            className="game-afk-loot-orb"
            style={{ left: orb.originX, top: orb.originY }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
            animate={{
              x: [0, orb.arcDx, orb.dx],
              y: [0, orb.arcDy, orb.dy],
              opacity: [0, 1, 0.85],
              scale: [0.3, 1.1, 0.55],
            }}
            transition={{
              duration: ORB_TRAVEL_SEC,
              delay: orb.delay,
              ease: ['easeOut', 'easeIn'],
            }}
            onAnimationComplete={() => handleArrive(orb)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
