import { avatarArtAlt, avatarArtSrc } from '@/lib/avatar-art';

interface Props {
  avatarId: string;
  letter?: string;
  unlocked?: boolean;
  className?: string;
  title?: string;
}

export function AvatarPortrait({ avatarId, letter, unlocked = true, className = '', title }: Props) {
  const src = avatarArtSrc(avatarId);
  const showLetter = avatarId === 'avatar_inicial' && letter;

  if (!src) {
    return (
      <span className={`game-avatar-initial-letter ${className}`.trim()} aria-hidden>
        {letter?.[0]?.toUpperCase() ?? '?'}
      </span>
    );
  }

  return (
    <span
      className={`game-avatar-portrait ${unlocked ? '' : 'game-avatar-portrait--locked'} ${className}`.trim()}
      title={title}
    >
      <img
        src={src}
        alt={avatarArtAlt(avatarId, title)}
        className="game-avatar-portrait__img"
        draggable={false}
      />
      {showLetter && (
        <span className="game-avatar-portrait__letter" aria-hidden>
          {letter[0].toUpperCase()}
        </span>
      )}
    </span>
  );
}
