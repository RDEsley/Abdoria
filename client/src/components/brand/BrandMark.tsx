import { BRAND_LOGO_SRC, brandMarkSrc } from '@/lib/brand';

interface BrandMarkProps {
  size?: number;
  className?: string;
  alt?: string;
  variant?: 'mark' | 'full';
}

export function BrandMark({
  size = 48,
  className = '',
  alt = 'Evolyn',
  variant = 'mark',
}: BrandMarkProps) {
  return (
    <img
      src={variant === 'full' ? BRAND_LOGO_SRC : brandMarkSrc(size)}
      alt={alt}
      className={className}
      width={size}
      height={size}
      decoding="async"
    />
  );
}
