import { useEffect, useState } from 'react';

/** Sobreposição do teclado virtual via Visual Viewport (0 quando fechado). */
export function useVisualViewportInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const update = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setInset(overlap);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
