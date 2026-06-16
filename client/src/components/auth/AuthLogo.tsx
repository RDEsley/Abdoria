interface Props {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizes = {
  sm: { img: 64, className: 'h-16 w-16' },
  md: { img: 80, className: 'h-20 w-20' },
  lg: { img: 112, className: 'h-28 w-28' },
};

export function AuthLogo({ size = 'md', showLabel = true, className = '' }: Props) {
  const { img, className: dim } = sizes[size];

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img
        src="/brand/logo.png"
        alt="Abdoria"
        className={`${dim} object-contain game-logo-pixel`}
        width={img}
        height={img}
      />
      {showLabel && (
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-teal-700">Abdoria</p>
      )}
    </div>
  );
}
