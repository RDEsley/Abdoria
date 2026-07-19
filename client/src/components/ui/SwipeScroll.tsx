import { ChevronLeft, ChevronRight } from 'lucide-react';
import { forwardRef, useRef, type ComponentPropsWithoutRef } from 'react';
import { useHorizontalScrollNav } from '@/hooks/useHorizontalScrollNav';
import { mergeRefs } from '@/lib/merge-refs';

type SwipeScrollTag = 'div' | 'nav';

type SwipeScrollProps = {
  as?: SwipeScrollTag;
  className?: string;
  arrows?: boolean;
  prevLabel?: string;
  nextLabel?: string;
} & ComponentPropsWithoutRef<'div'>;

export const SwipeScroll = forwardRef<HTMLDivElement, SwipeScrollProps>(function SwipeScroll(
  {
    as: Tag = 'div',
    className = '',
    arrows = true,
    prevLabel = 'Ver opções anteriores',
    nextLabel = 'Ver mais opções',
    children,
    ...rest
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollPrev, scrollNext } =
    useHorizontalScrollNav(localRef);

  const scrollable = (
    <Tag
      ref={mergeRefs(forwardedRef, localRef)}
      className={`game-swipe-scroll${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </Tag>
  );

  if (!arrows) return scrollable;

  const wrapClass = [
    'game-swipe-scroll-wrap',
    canScrollLeft ? 'game-swipe-scroll-wrap--can-prev' : '',
    canScrollRight ? 'game-swipe-scroll-wrap--can-next' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass}>
      {/* Sempre montadas (nunca somem/aparecem abruptamente) — a visibilidade
          é uma transição CSS de opacidade/posição, não um mount/unmount. */}
      <button
        type="button"
        className={`game-swipe-scroll__arrow game-swipe-scroll__arrow--prev${
          canScrollLeft ? ' game-swipe-scroll__arrow--visible' : ''
        }`}
        aria-label={prevLabel}
        aria-hidden={!canScrollLeft}
        tabIndex={canScrollLeft ? 0 : -1}
        onClick={scrollPrev}
      >
        <ChevronLeft size={18} strokeWidth={3} aria-hidden />
      </button>

      {scrollable}

      <button
        type="button"
        className={`game-swipe-scroll__arrow game-swipe-scroll__arrow--next${
          canScrollRight ? ' game-swipe-scroll__arrow--visible' : ''
        }`}
        aria-label={nextLabel}
        aria-hidden={!canScrollRight}
        tabIndex={canScrollRight ? 0 : -1}
        onClick={scrollNext}
      >
        <ChevronRight size={18} strokeWidth={3} aria-hidden />
      </button>
    </div>
  );
});
