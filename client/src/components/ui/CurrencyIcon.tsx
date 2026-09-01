import { useId, type CSSProperties } from 'react';

export interface CurrencyIconProps {
  variant?: 'leaf' | 'golden';
  size?: number;
  className?: string;
  animated?: boolean;
  title?: string;
  'aria-hidden'?: boolean;
}

/** Símbolo oficial das moedas do Evolyn: folha orgânica e folha dourada facetada. */
export function CurrencyIcon({
  variant = 'leaf',
  size = 18,
  className = '',
  animated = false,
  title,
  'aria-hidden': ariaHidden = true,
}: CurrencyIconProps) {
  const gradientId = `currency-${useId().replace(/:/g, '')}`;
  const isGolden = variant === 'golden';
  const style = { '--currency-icon-size': `${size}px` } as CSSProperties;

  return (
    <span
      className={`currency-icon currency-icon--${variant} ${animated ? 'currency-icon--animated' : ''} ${className}`.trim()}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : ariaHidden}
    >
      <svg viewBox="0 0 32 32" focusable="false" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="8" y1="6" x2="24" y2="27">
            {isGolden ? (
              <>
                <stop offset="0" stopColor="#fff8bd" />
                <stop offset="0.46" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#b45309" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="#86efac" />
                <stop offset="0.48" stopColor="#10b981" />
                <stop offset="1" stopColor="#047857" />
              </>
            )}
          </linearGradient>
        </defs>

        <path
          className="currency-icon__leaf"
          d="M25.8 4.3C18.4 4.8 10.6 7.7 7.1 13.2c-3.4 5.2-1 11.7 5.2 13.2 5.3 1.2 10.4-2.3 11.8-7.7 1.3-5.1.3-9.7 1.7-14.4Z"
          fill={`url(#${gradientId})`}
        />
        <path
          className="currency-icon__highlight"
          d="M23.4 6.9c-5.2 1.5-10.1 4.3-13 8.2-2.4 3.3-2 6.9.2 8.8-1.1-3.2.5-7.1 3.6-10.2 2.5-2.6 5.8-4.8 9.2-6.8Z"
        />
        <path
          className="currency-icon__vein"
          d="M7.9 26.8c3.5-6.7 8.3-12.7 15.3-18.1M12.5 20.1l-4-.1M16.7 15.7l.2 4.4"
        />

        {isGolden ? (
          <>
            <path className="currency-icon__facet" d="m14.2 13.7 2.5 2 6.5-7-4.7 8.8Z" />
            <path className="currency-icon__facet" d="m10.6 23.9 6.1-8.2.2 4.4Z" />
            <path className="currency-icon__sparkle" d="M26.8 2.8v4.4M24.6 5h4.4" />
          </>
        ) : (
          <path
            className="currency-icon__dew"
            d="M18.4 9.5c.7-1.2 1.7-1.7 2.2-1-.1 1.4-.8 2.4-1.8 2.6-.7.1-.9-.6-.4-1.6Z"
          />
        )}
      </svg>
    </span>
  );
}

export function GameLeafIcon(props: Omit<CurrencyIconProps, 'variant'>) {
  return <CurrencyIcon {...props} variant="leaf" />;
}

export function GoldenLeafIcon(props: Omit<CurrencyIconProps, 'variant'>) {
  return <CurrencyIcon {...props} variant="golden" />;
}
