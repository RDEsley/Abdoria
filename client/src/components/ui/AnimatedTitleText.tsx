import type { CSSProperties } from 'react';
import type { ResolvedTitle } from '@/lib/cosmetic-title';

interface Props {
  title: ResolvedTitle | null;
  className?: string;
}

/**
 * Renderiza o título equipado. Títulos comuns viram um <span> simples; títulos
 * marcados com `animateChars` (ex.: "???????") quebram em spans por caractere
 * pra cada um pular levemente com um delay escalonado (--i).
 */
export function AnimatedTitleText({ title, className = '' }: Props) {
  if (!title) return null;
  const cls = `${className} ${title.variantClass}`.trim();

  if (!title.animateChars) {
    return <span className={cls}>{title.name}</span>;
  }

  return (
    <span className={cls} aria-label={title.name}>
      {title.name.split('').map((char, i) => (
        <span
          key={i}
          className="cosmetic-title--enigma__char"
          style={{ '--i': i } as CSSProperties}
          aria-hidden="true"
        >
          {char}
        </span>
      ))}
    </span>
  );
}
