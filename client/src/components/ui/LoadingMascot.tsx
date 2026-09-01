import { BrandMark } from '@/components/brand/BrandMark';

export function LoadingMascot({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'flex items-center justify-center rounded-full border border-white/70 bg-white/70 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <span className="game-loading-mark" aria-hidden>
        <BrandMark size={112} alt="" className="h-full w-full object-contain" />
      </span>
    </div>
  );
}
