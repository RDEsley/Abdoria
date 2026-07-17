import { Eye, RotateCcw } from 'lucide-react';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { EffectPreview } from '@/components/shop/EffectPreview';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import type { CosmeticKind, IUserDocument } from '@/types';
import { resolveCosmeticos } from '@/types';

interface PreviewState {
  moldura_loja?: string;
  titulo?: string;
  banner?: string;
  som?: string;
  efeito?: string;
}

interface Props {
  user: IUserDocument | null;
  firstName: string;
  preview: PreviewState;
  hasPreviewOverrides: boolean;
  onResetPreview: () => void;
}

export function ShopPreviewStage({
  user,
  firstName,
  preview,
  hasPreviewOverrides,
  onResetPreview,
}: Props) {
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const borderId = preview.moldura_loja ?? cosmeticos.moldura_loja_equipada;
  const titleId = preview.titulo ?? cosmeticos.titulo_equipado;
  const bannerId = preview.banner ?? cosmeticos.banner_equipado;
  const effectId = preview.efeito ?? cosmeticos.efeito_equipado;

  const titleName = titleId ? COSMETIC_BY_ID[titleId]?.nome : null;

  const previewFlags: Partial<Record<CosmeticKind, boolean>> = {
    moldura_loja: Boolean(
      preview.moldura_loja && preview.moldura_loja !== cosmeticos.moldura_loja_equipada,
    ),
    titulo: Boolean(preview.titulo && preview.titulo !== (cosmeticos.titulo_equipado ?? '')),
    banner: Boolean(preview.banner && preview.banner !== cosmeticos.banner_equipado),
    efeito: Boolean(preview.efeito && preview.efeito !== cosmeticos.efeito_equipado),
  };

  const titleClass =
    titleId === 'titulo_dono_do_jogo'
      ? 'game-shop-preview__title cosmetic-title--dono-do-jogo'
      : `game-shop-preview__title${previewFlags.titulo ? ' game-shop-preview__title--preview' : ''}`;

  return (
    <aside className="game-shop-preview">
      <div
        className={`game-shop-preview__frame game-card-banner--${bannerId.replace('fundo_', '')}`}
      >
        <div className="game-shop-preview__frame-corner game-shop-preview__frame-corner--tl" />
        <div className="game-shop-preview__frame-corner game-shop-preview__frame-corner--tr" />
        <div className="game-shop-preview__frame-corner game-shop-preview__frame-corner--bl" />
        <div className="game-shop-preview__frame-corner game-shop-preview__frame-corner--br" />

        <div className="game-shop-preview__head">
          <span className="game-shop-preview__eyebrow">
            <Eye size={12} /> Prévia ao vivo
          </span>
          {hasPreviewOverrides && (
            <button type="button" className="game-shop-preview__reset" onClick={onResetPreview}>
              <RotateCcw size={12} /> Equipado
            </button>
          )}
        </div>

        <div className="game-shop-preview__stage">
          <EffectPreview effectId={effectId} />
          <CosmeticAvatar user={user} size="lg" borderId={borderId} />
        </div>

        <div className="game-shop-preview__meta">
          <p className="game-shop-preview__name">{firstName}</p>
          {titleName && <p className={titleClass}>{titleName}</p>}
        </div>

        <div className="game-shop-preview__tags">
          {previewFlags.moldura_loja && (
            <span className="game-shop-preview__tag">Moldura teste</span>
          )}
          {previewFlags.titulo && <span className="game-shop-preview__tag">Título teste</span>}
          {previewFlags.banner && <span className="game-shop-preview__tag">Banner teste</span>}
          {previewFlags.efeito && <span className="game-shop-preview__tag">Efeito teste</span>}
        </div>
      </div>
    </aside>
  );
}
