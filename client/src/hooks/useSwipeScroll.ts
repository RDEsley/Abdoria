import { useCallback, useRef, type PointerEvent, type RefObject } from 'react';

const DRAG_THRESHOLD_PX = 6;

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"], [role="tab"], [contenteditable="true"]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

type DragState = {
  active: boolean;
  pointerId: number;
  startX: number;
  scrollLeft: number;
  dragged: boolean;
};

const INITIAL_DRAG: DragState = {
  active: false,
  pointerId: -1,
  startX: 0,
  scrollLeft: 0,
  dragged: false,
};

export function useSwipeScroll<T extends HTMLElement>(targetRef?: RefObject<T | null>) {
  const fallbackRef = useRef<T | null>(null);
  const ref = targetRef ?? fallbackRef;
  const dragRef = useRef<DragState>(INITIAL_DRAG);

  const stopDrag = useCallback((el: T, pointerId: number) => {
    el.classList.remove('game-swipe-scroll--dragging');
    try {
      el.releasePointerCapture(pointerId);
    } catch {
      /* pointer already released */
    }
    dragRef.current = INITIAL_DRAG;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<T>) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (isInteractiveTarget(event.target)) return;

      const el = ref.current;
      if (!el) return;

      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.pageX,
        scrollLeft: el.scrollLeft,
        dragged: false,
      };

      el.setPointerCapture(event.pointerId);
    },
    [ref],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      const el = ref.current;
      const drag = dragRef.current;
      if (!el || !drag.active || event.pointerId !== drag.pointerId) return;

      const delta = event.pageX - drag.startX;
      if (!drag.dragged && Math.abs(delta) <= DRAG_THRESHOLD_PX) return;

      if (!drag.dragged) {
        drag.dragged = true;
        el.classList.add('game-swipe-scroll--dragging');
      }

      event.preventDefault();
      el.scrollLeft = drag.scrollLeft - delta;
    },
    [ref],
  );

  const onPointerEnd = useCallback(
    (event: PointerEvent<T>) => {
      const el = ref.current;
      const drag = dragRef.current;
      if (!el || !drag.active || event.pointerId !== drag.pointerId) return;

      const wasDragged = drag.dragged;
      stopDrag(el, drag.pointerId);

      if (wasDragged) {
        const blockAccidentalClick = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopImmediatePropagation();
        };
        el.addEventListener('click', blockAccidentalClick, { capture: true, once: true });
      }
    },
    [ref, stopDrag],
  );

  return {
    ref,
    swipeHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerLeave: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
