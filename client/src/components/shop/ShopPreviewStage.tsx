import { Eye, RotateCcw, Zap } from 'lucide-react';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { EffectPreview } from '@/components/shop/EffectPreview';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import type { CosmeticKind, IUserDocument } from '@/types';
import { resolveCosmeticos } from '@/types';

interface PreviewState {
  avatar?: string;
  borda?: string;
  titulo?: string;
  fundo?: string;
  som?: string;
  efeito?: string;
}

interface Props {
  user: IUserDocument | null;
  firstName: string;
  xpLevel: number;
  abdoria: number;
  currencyName: string;
  preview: PreviewState;
  hasPreviewOverrides: boolean;
  onResetPreview: () => void;
}

export function ShopPreviewStage({
  user,
  firstName,
  xpLevel,
  abdoria,
  currencyName,
  preview,
  hasPreviewOverrides,
  onResetPreview,
}: Props) {
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const avatarId = preview.avatar ?? cosmeticos.avatar_equipado;
  const borderId = preview.borda ?? cosmeticos.borda_equipada;
  const titleId = preview.titulo ?? cosmeticos.titulo_equipado;
  const fundoId = preview.fundo ?? cosmeticos.fundo_equipado;
  const effectId = preview.efeito ?? cosmeticos.efeito_equipado;

  const titleName = titleId ? COSMETIC_BY_ID[titleId]?.nome : null;
  const effectName = COSMETIC_BY_ID[effectId]?.nome ?? 'Padrão';

  const previewFlags: Partial<Record<CosmeticKind, boolean>> = {
    avatar: Boolean(preview.avatar && preview.avatar !== cosmeticos.avatar_equipado),
    borda: Boolean(preview.borda && preview.borda !== cosmeticos.borda_equipada),
    titulo: Boolean(preview.titulo && preview.titulo !== (cosmeticos.titulo_equipado ?? '')),
    fundo: Boolean(preview.fundo && preview.fundo !== cosmeticos.fundo_equipado),
    efeito: Boolean(preview.efeito && preview.efeito !== cosmeticos.efeito_equipado),
  };

  const titleClass =
    titleId === 'titulo_dono_do_jogo'
      ? 'game-shop-preview__title cosmetic-title--dono-do-jogo'
      : `game-shop-preview__title${previewFlags.titulo ? ' game-shop-preview__title--preview' : ''}`;

  return (
    <aside className="game-shop-preview">
      <div className={`game-shop-preview__frame game-card-fundo--${fundoId.replace('fundo_', '')}`}>
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
          <span className="game-shop-preview__effect-label">{effectName}</span>
          <CosmeticAvatar user={user} size="lg" avatarId={avatarId} borderId={borderId} />
        </div>

        <div className="game-shop-preview__meta">
          <p className="game-shop-preview__name">{firstName}</p>
          {titleName && <p className={titleClass}>{titleName}</p>}
          <p className="game-shop-preview__level">Nível {xpLevel} · {abdoria} {currencyName}</p>
        </div>

        <div className="game-shop-preview__tags">
          {previewFlags.avatar && <span className="game-shop-preview__tag">Ícone teste</span>}
          {previewFlags.borda && <span className="game-shop-preview__tag">Borda teste</span>}
          {previewFlags.titulo && <span className="game-shop-preview__tag">Título teste</span>}
          {previewFlags.fundo && <span className="game-shop-preview__tag">Fundo teste</span>}
          {previewFlags.efeito && <span className="game-shop-preview__tag">Efeito teste</span>}
        </div>

        <p className="game-shop-preview__hint">
          <Zap size={12} /> Efeito: {effectName} (animado acima)
        </p>
      </div>
    </aside>
  );
}
