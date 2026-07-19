import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';

interface Props {
  file: File;
  onCancel: () => void;
  /** Recebe o recorte final como data URL JPEG 512×512. */
  onConfirm: (dataUrl: string) => void;
}

const VIEWPORT = 260;
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/** Ajuste de foto estilo WhatsApp: arrasta para posicionar e pinça/slider para zoom. */
export function PhotoCropper({ file, onCancel, onConfirm }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );
  /** true durante e logo após um arraste — evita que o "click" fantasma que
      o navegador dispara no fundo (quando o release termina fora do
      viewport) seja lido como "cancelar". */
  const draggedRef = useRef(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = imgSize ? VIEWPORT / Math.min(imgSize.w, imgSize.h) : 1;
  const scale = baseScale * zoom;

  const clampOffset = (x: number, y: number, nextScale = scale) => {
    if (!imgSize) return { x, y };
    const maxX = Math.max(0, (imgSize.w * nextScale - VIEWPORT) / 2);
    const maxY = Math.max(0, (imgSize.h * nextScale - VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const handleZoom = (nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(clamped);
    setOffset((prev) => clampOffset(prev.x, prev.y, baseScale * clamped));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) draggedRef.current = true;
    setOffset(clampOffset(drag.baseX + dx, drag.baseY + dy));
  };

  const onPointerUp = () => {
    dragRef.current = null;
    // O click fantasma (se houver) chega em seguida, ainda síncrono — zera a
    // flag só depois, num timeout, pra não travar um cancelar de verdade.
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Nunca deixa o clique escapar pro modal pai (ProfileEditModal) — cancelar
    // o recorte não pode fechar a edição de perfil inteira (bug de bubbling
    // via árvore React entre portais aninhados).
    e.stopPropagation();
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onCancel();
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !imgSize) return;

    const srcSize = VIEWPORT / scale;
    const sx = imgSize.w / 2 - (VIEWPORT / 2 + offset.x) / scale;
    const sy = imgSize.h / 2 - (VIEWPORT / 2 + offset.y) / scale;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  };

  return createPortal(
    <div className="game-modal-overlay" role="presentation" onClick={handleBackdropClick}>
      <div
        className="game-modal photo-cropper"
        role="dialog"
        aria-modal="true"
        aria-label="Ajustar foto de perfil"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="photo-cropper__title">Ajustar foto</h2>
        <p className="photo-cropper__hint">Arraste para posicionar.</p>

        <div
          className="photo-cropper__viewport"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imageUrl && (
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              draggable={false}
              className="photo-cropper__img"
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px) ) scale(${scale})`,
              }}
              onLoad={(e) => {
                const el = e.currentTarget;
                setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
              }}
            />
          )}
          <span className="photo-cropper__mask" aria-hidden />
        </div>

        <div className="photo-cropper__zoom">
          <ZoomOut size={16} aria-hidden />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="Zoom da foto"
            onChange={(e) => handleZoom(Number(e.target.value))}
          />
          <ZoomIn size={16} aria-hidden />
        </div>

        <div className="photo-cropper__actions">
          <GameButton variant="ghost" className="!w-auto px-4" onClick={onCancel}>
            Cancelar
          </GameButton>
          <GameButton className="!w-auto px-5" disabled={!imgSize} onClick={handleConfirm}>
            Usar foto
          </GameButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
