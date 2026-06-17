import { useCallback, useEffect, useState, type RefObject } from 'react';

const EDGE_TOLERANCE_PX = 6;

export function useHorizontalScrollNav(ref: RefObject<HTMLElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const refresh = useCallback(() => {
    const el = ref.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > EDGE_TOLERANCE_PX);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE_PX);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    refresh();

    el.addEventListener('scroll', refresh, { passive: true });
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(refresh);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', refresh);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref, refresh]);

  const scrollByPage = useCallback(
    (direction: 'prev' | 'next') => {
      const el = ref.current;
      if (!el) return;

      const amount = Math.max(el.clientWidth * 0.72, 160);
      el.scrollBy({
        left: direction === 'next' ? amount : -amount,
        behavior: 'smooth',
      });
    },
    [ref],
  );

  return {
    canScrollLeft,
    canScrollRight,
    scrollPrev: () => scrollByPage('prev'),
    scrollNext: () => scrollByPage('next'),
    refresh,
  };
}
