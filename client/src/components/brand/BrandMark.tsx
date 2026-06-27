import { brandMarkSrc } from '@/lib/brand';

interface BrandMarkProps {
  size?: number;
  className?: string;
  alt?: string;
}

export function BrandMark({ size = 48, className = '', alt = 'Abdoria' }: BrandMarkProps) {
  return (
    <img
      src={brandMarkSrc(size)}
      alt={alt}
      className={className}
      width={size}
      height={size}
      decoding="async"
    />
  );
}
