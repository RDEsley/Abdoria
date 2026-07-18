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
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(
      clampOffset(drag.baseX + (e.clientX - drag.startX), drag.baseY + (e.clientY - drag.startY)),
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
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
    <div className="game-modal-overlay" role="presentation" onClick={onCancel}>
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
