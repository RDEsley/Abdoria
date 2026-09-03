import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PRIMARY_NAV_ITEMS, primaryNavIndex } from '@/lib/primary-nav';
import { playTabSwitch } from '@/lib/sounds';
import { selectionHaptic } from '@/lib/platform/native-runtime';

const AXIS_LOCK_PX = 12;
const COMMIT_PX = 72;
const IGNORE_SELECTOR = '[data-no-nav-swipe], input, textarea, select, [contenteditable="true"]';

/**
 * Swipe horizontal entre as 5 telas do menu inferior (estilo Clash Royale).
 * Só atua nas rotas primárias e cede para gestos internos (cards, DnD, inputs).
 */
export function usePrimaryNavSwipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [enterFrom, setEnterFrom] = useState(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<'undecided' | 'x' | 'y'>('undecided');
  const indexRef = useRef(primaryNavIndex(location.pathname));

  useEffect(() => {
    indexRef.current = primaryNavIndex(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (!enterFrom) return;
    const timer = window.setTimeout(() => setEnterFrom(0), 120);
    return () => window.clearTimeout(timer);
  }, [enterFrom]);

  useEffect(() => {
    if (!node) return;

    const reset = () => {
      startRef.current = null;
      axisRef.current = 'undecided';
    };

    const onStart = (event: TouchEvent) => {
      if (indexRef.current < 0 || event.touches.length !== 1) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(IGNORE_SELECTOR)) return;
      startRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      axisRef.current = 'undecided';
    };

    const onMove = (event: TouchEvent) => {
      if (!startRef.current || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - startRef.current.x;
      const dy = event.touches[0].clientY - startRef.current.y;
      if (axisRef.current === 'undecided') {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      }
      if (axisRef.current === 'x') event.preventDefault();
    };

    const onEnd = (event: TouchEvent) => {
      const start = startRef.current;
      const axis = axisRef.current;
      const index = indexRef.current;
      reset();
      if (!start || axis !== 'x' || index < 0) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      if (Math.abs(dx) < COMMIT_PX) return;
      const nextIndex = dx < 0 ? index + 1 : index - 1;
      const next = PRIMARY_NAV_ITEMS[nextIndex];
      if (!next) return;
      setEnterFrom(dx < 0 ? 1 : -1);
      playTabSwitch();
      void selectionHaptic();
      navigate(next.to);
    };

    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', reset);
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', reset);
    };
  }, [navigate, node]);

  return { setSwipeNode: setNode, enterFrom };
}
