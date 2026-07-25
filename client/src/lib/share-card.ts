import { toBlob } from 'html-to-image';
import type { ShareCardData } from '@/components/share/ShareCard';

/** Espera as webfonts carregarem (Press Start 2P é remota) antes de capturar o nó. */
export async function exportShareCardBlob(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  const blob = await toBlob(node, { pixelRatio: 4 });
  if (!blob) throw new Error('Não foi possível gerar a imagem.');
  return blob;
}

/**
 * Legenda em primeira pessoa pro compartilhamento — o card já carrega a marca
 * visualmente, então o texto foca em soar como o próprio jogador comemorando,
 * não como propaganda do app.
 */
export function buildShareMessage(data: ShareCardData): string {
  if (data.kind === 'streak') {
    return `${data.streakAtual} dias treinando sem parar — a ofensiva tá pegando fogo 🔥`;
  }
  if (data.kind === 'record') {
    return `Novo recorde pessoal em ${data.exerciseName}: ${data.previousValue} → ${data.newValue} 🏆`;
  }
  const streakSuffix =
    typeof data.streakAtual === 'number' && data.streakAtual > 0
      ? ` (${data.streakAtual} dias seguidos)`
      : '';
  return `Mais uma missão concluída: ${data.workoutName}, +${data.xpGained} XP${streakSuffix} 💪`;
}

/** Compartilha via Web Share API (com arquivo) quando disponível; senão baixa o PNG. */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  text?: string,
): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Abdoria', text });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // navigator.share falhou por outro motivo — cai pro download abaixo.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
