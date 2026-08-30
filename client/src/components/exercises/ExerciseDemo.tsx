import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { exerciseGifUrl } from '@/lib/media';

interface Props {
  name: string;
  mediaFile?: string | null;
  className?: string;
  imageClassName?: string;
  decorative?: boolean;
  onAvailabilityChange?: (available: boolean) => void;
}

/** Demonstração interna com fallback visual consistente e sem imagem quebrada. */
export function ExerciseDemo({
  name,
  mediaFile,
  className = '',
  imageClassName = '',
  decorative = false,
  onAvailabilityChange,
}: Props) {
  const [failed, setFailed] = useState(!mediaFile);

  useEffect(() => {
    const nextFailed = !mediaFile;
    setFailed(nextFailed);
    onAvailabilityChange?.(!nextFailed);
  }, [mediaFile, onAvailabilityChange]);

  const markFailed = () => {
    setFailed(true);
    onAvailabilityChange?.(false);
  };

  return (
    <div className={`exercise-demo ${failed ? 'exercise-demo--fallback' : ''} ${className}`.trim()}>
      {!failed && mediaFile ? (
        <img
          src={exerciseGifUrl(mediaFile)}
          alt={decorative ? '' : `Demonstração de ${name}`}
          aria-hidden={decorative || undefined}
          className={`exercise-demo__image ${imageClassName}`.trim()}
          onError={markFailed}
        />
      ) : (
        <div
          className="exercise-demo__fallback"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : `Demonstração visual indisponível para ${name}`}
        >
          <Activity size={34} aria-hidden />
          <strong>{name}</strong>
          <span>Use os passos do guia para executar o movimento.</span>
        </div>
      )}
    </div>
  );
}
