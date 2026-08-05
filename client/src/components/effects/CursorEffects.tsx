import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const TRAIL_COUNT = 6;
const TRAIL_DOT_SIZE = 7;
/** Quanto maior, mais "colado" no cursor cada ponto fica do anterior. */
const TRAIL_EASE = 0.32;

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * Rastro suave atrás do cursor (só em dispositivos com mouse — em touch não
 * existe cursor pairando, então nem monta) + uma onda leve a cada toque/
 * clique em qualquer lugar do app, confirmando o ponto sem atrapalhar.
 * Tudo `pointer-events: none`: nunca intercepta um clique de verdade.
 *
 * Some sozinha com "Celebrações" desligado nas Configurações — mesma
 * preferência que já controla o resto da flourish visual do app
 * (`confetti_animacoes_habilitadas`, lida aqui via `useReducedMotion`
 * porque o <MotionConfig> em App.tsx já espelha essa preferência).
 */
export function CursorEffects() {
  const reduceMotion = useReducedMotion();
  const [hasFinePointer, setHasFinePointer] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setHasFinePointer(mq.matches);
    const onChange = () => setHasFinePointer(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      rippleIdRef.current += 1;
      const ripple: Ripple = { id: rippleIdRef.current, x: event.clientX, y: event.clientY };
      setRipples((prev) => [...prev, ripple]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 700);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div className="cursor-effects-layer" aria-hidden>
      {hasFinePointer && <CursorTrail />}

      {ripples.map((r) => (
        <motion.span
          key={r.id}
          className="cursor-effects-ripple"
          style={{ left: r.x, top: r.y }}
          initial={{ opacity: 0.45, scale: 0 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/**
 * Posição atualizada por RAF direto no DOM (não estado/motion values por
 * ponto) — um rastro precisa reagir a cada frame do mousemove, e passar
 * isso por re-render do React só pra mover um <span> seria desperdício.
 * Cada ponto persegue o anterior com o mesmo fator de suavização, criando o
 * efeito de "cobrinha" atrás do cursor.
 */
function CursorTrail() {
  const dotsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const mouseRef = useRef({ x: -100, y: -100 });
  const positionsRef = useRef(
    Array.from({ length: TRAIL_COUNT }, () => ({ x: -100, y: -100 })),
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };
    window.addEventListener('pointermove', onMove);

    let raf = 0;
    const half = TRAIL_DOT_SIZE / 2;
    const tick = () => {
      let targetX = mouseRef.current.x;
      let targetY = mouseRef.current.y;
      for (let i = 0; i < positionsRef.current.length; i += 1) {
        const pos = positionsRef.current[i];
        pos.x += (targetX - pos.x) * TRAIL_EASE;
        pos.y += (targetY - pos.y) * TRAIL_EASE;
        const el = dotsRef.current[i];
        if (el) el.style.transform = `translate3d(${pos.x - half}px, ${pos.y - half}px, 0)`;
        targetX = pos.x;
        targetY = pos.y;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            dotsRef.current[i] = el;
          }}
          className="cursor-effects-dot"
          style={{ opacity: 1 - i / TRAIL_COUNT }}
        />
      ))}
    </>
  );
}
