import { RotateCcw } from 'lucide-react';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { EffectPreview } from '@/components/shop/EffectPreview';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import type { IUserDocument } from '@/types';
import { resolveCosmeticos, xpProgressFromTotal } from '@/types';

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

/** Prévia com o mesmo visual do hero do perfil — é lá que os cosméticos aparecem. */
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

  const titleName = titleId ? COSMETIC_BY_ID[titleId]?.nome : null;
  const xpLevel = user ? xpProgressFromTotal(user.gamificacao.nivel_xp).level : 1;

  const titleClass =
    titleId === 'titulo_dono_do_jogo'
      ? 'game-profile-hero__title cosmetic-title--dono-do-jogo'
      : titleId === 'titulo_secreto'
        ? 'game-profile-hero__title cosmetic-title--secreto'
        : 'game-profile-hero__title';

  const fundoKey = bannerId.replace('fundo_', '');
  const shellClass =
    fundoKey === 'padrao'
      ? 'game-profile-hero-shell game-profile-hero-shell--default'
      : fundoKey === 'praia'
        ? `game-profile-hero-shell game-profile-hero-shell--skinned-light game-card-banner--${fundoKey}`
        : `game-profile-hero-shell game-profile-hero-shell--skinned game-card-banner--${fundoKey}`;

  return (
    <aside className="game-shop-preview">
      <div className={`${shellClass} game-shop-preview__hero`}>
        <i className="game-profile-hero-shell__ring" aria-hidden />
        {hasPreviewOverrides && (
          <button type="button" className="game-shop-preview__reset" onClick={onResetPreview}>
            <RotateCcw size={12} /> Equipado
          </button>
        )}
        <div className="game-profile-hero">
          <span className="game-profile-hero__avatar-wrap">
            {preview.efeito && <EffectPreview effectId={preview.efeito} />}
            <CosmeticAvatar user={user} size="lg" borderId={borderId} />
            <span className="game-profile-hero__level-badge" aria-label={`Nível ${xpLevel}`}>
              {xpLevel}
            </span>
          </span>
          <div className="game-profile-hero__meta min-w-0">
            <p className="game-profile-hero__name-row">
              <span className="game-profile-hero__name truncate">{firstName}</span>
              {titleName && <span className={titleClass}>{titleName}</span>}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
