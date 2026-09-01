import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { buildShareMessage, exportShareCardBlob, shareOrDownloadImage } from '@/lib/share-card';
import { useAuth } from '@/hooks/useAuth';
import { ShareCard, type ShareCardData } from '@/components/share/ShareCard';

interface Props {
  data: ShareCardData;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

/** Botão que gera e compartilha o ShareCard correspondente — o card é renderizado off-screen. */
export function ShareCardTrigger({
  data,
  label = 'Compartilhar',
  variant = 'secondary',
  className = '',
}: Props) {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const blob = await exportShareCardBlob(cardRef.current);
      await shareOrDownloadImage(
        blob,
        `evolyn-${data.kind}-${Date.now()}.png`,
        buildShareMessage(data),
      );
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível gerar a imagem.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <GameButton
        variant={variant}
        className={`flex items-center justify-center gap-2 ${className}`.trim()}
        onClick={() => void handleShare()}
        disabled={busy}
      >
        <Share2 size={16} aria-hidden />
        {busy ? 'Gerando...' : label}
      </GameButton>

      <div style={{ position: 'fixed', top: 0, left: -9999, pointerEvents: 'none' }} aria-hidden>
        <div ref={cardRef}>
          <ShareCard data={data} user={user} />
        </div>
      </div>
    </>
  );
}
