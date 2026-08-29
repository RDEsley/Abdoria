import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XP_EARNED_EVENT,
  XP_ORB_LANDED_EVENT,
  XP_PER_ORB,
  XP_BAR_TARGET_ATTR,
  type XpEarnedDetail,
} from '@/lib/xp-orbs';

/** Teto de bolinhas por leva — ganhos grandes (ex.: coletar horas de
    recompensas acumuladas) escalam o valor de cada bolinha em vez de spawnar
    centenas delas. */
const MAX_ORBS = 14;
const ORB_TRAVEL_SEC = 0.62;
const ORB_STAGGER_SEC = 0.055;

interface OrbSpec {
  id: string;
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  arcDx: number;
  arcDy: number;
  delay: number;
  value: number;
}

let seq = 0;

function resolveTargetPoint(): { x: number; y: number } {
  const el = document.querySelector(`[${XP_BAR_TARGET_ATTR}]`);
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }
  // Barra de XP não montada nessa tela (ex.: página cheia sem TopNavbar) —
  // mira onde ela normalmente fica, pra bolinha "sumir no lugar certo" em
  // vez de flutuar sem destino.
  return { x: Math.min(150, window.innerWidth * 0.24), y: 46 };
}

/**
 * Camada global de bolinhas de XP (estilo Minecraft): escuta XP_EARNED_EVENT
 * e faz bolinhas voarem da origem do ganho até a barra de XP do topo,
 * disparando XP_ORB_LANDED_EVENT a cada uma que chega — quem desenha a barra
 * (GameHud) usa isso pra só subir o preenchimento na chegada, em ordem.
 */
export function XpOrbLayer() {
  const [orbs, setOrbs] = useState<OrbSpec[]>([]);

  useEffect(() => {
    const onXpEarned = (event: Event) => {
      const detail = (event as CustomEvent<XpEarnedDetail>).detail;
      const amount = detail?.amount ?? 0;
      if (amount <= 0) return;

      const origin = detail.originRect
        ? {
            x: detail.originRect.left + detail.originRect.width / 2,
            y: detail.originRect.top + detail.originRect.height / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const target = resolveTargetPoint();

      const rawOrbCount = Math.round(amount / XP_PER_ORB) || 1;
      const orbCount = Math.max(1, Math.min(MAX_ORBS, rawOrbCount));
      const base = Math.floor(amount / orbCount);
      const remainder = amount - base * orbCount;

      const spawned: OrbSpec[] = [];
      for (let i = 0; i < orbCount; i += 1) {
        seq += 1;
        spawned.push({
          id: `xp-orb-${seq}`,
          originX: origin.x + (Math.random() - 0.5) * 26,
          originY: origin.y + (Math.random() - 0.5) * 18,
          dx: target.x - origin.x,
          dy: target.y - origin.y,
          arcDx: (Math.random() - 0.5) * 70,
          arcDy: -Math.abs(60 + Math.random() * 50),
          delay: i * ORB_STAGGER_SEC,
          // Última bolinha da leva carrega o resto da divisão — soma sempre
          // bate certinho com o total ganho.
          value: base + (i === orbCount - 1 ? remainder : 0),
        });
      }
      setOrbs((prev) => [...prev, ...spawned]);
    };

    window.addEventListener(XP_EARNED_EVENT, onXpEarned);
    return () => window.removeEventListener(XP_EARNED_EVENT, onXpEarned);
  }, []);

  const handleArrive = (orb: OrbSpec) => {
    window.dispatchEvent(new CustomEvent(XP_ORB_LANDED_EVENT, { detail: { amount: orb.value } }));
    setOrbs((prev) => prev.filter((o) => o.id !== orb.id));
  };

  if (orbs.length === 0) return null;

  return createPortal(
    <div className="xp-orb-layer" aria-hidden>
      <AnimatePresence>
        {orbs.map((orb) => (
          <motion.span
            key={orb.id}
            className="xp-orb-layer__orb"
            style={{ left: orb.originX, top: orb.originY }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: [0, orb.arcDx, orb.dx],
              y: [0, orb.arcDy, orb.dy],
              opacity: [0, 1, 0.9],
              scale: [0.4, 1, 0.7],
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
