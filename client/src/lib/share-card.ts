import { toBlob } from 'html-to-image';

/** Espera as webfonts carregarem (Press Start 2P é remota) antes de capturar o nó. */
export async function exportShareCardBlob(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  const blob = await toBlob(node, { pixelRatio: 4 });
  if (!blob) throw new Error('Não foi possível gerar a imagem.');
  return blob;
}

/** Compartilha via Web Share API (com arquivo) quando disponível; senão baixa o PNG. */
export async function shareOrDownloadImage(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Abdoria' });
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
