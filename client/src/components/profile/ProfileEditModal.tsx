import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Lock, Trash2, X } from 'lucide-react';
import { CosmeticScrollPicker } from '@/components/profile/CosmeticScrollPicker';
import { PhotoCropper } from '@/components/profile/PhotoCropper';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { resolveIdentityBorder } from '@/lib/identity-border';
import { playEquip } from '@/lib/sounds';
import {
  changeName,
  equipMoldura,
  equipShopItem,
  getMolduraStatus,
  getShop,
  removeProfilePhoto,
  updateMe,
  uploadProfilePhoto,
  type MolduraStatusResponse,
} from '@/lib/api';
import {
  CURRENCY_NAME,
  MOLDURA_LABELS,
  NAME_CHANGE_COST,
  NOME_MAX_LENGTH,
  NOME_MIN_LENGTH,
  type IUserDocument,
  type MolduraId,
  type ShopResponse,
} from '@/types';

interface Props {
  open: boolean;
  profile: IUserDocument;
  onClose: () => void;
  /** Recarrega usuário/app depois de foto, nome, moldura, título ou descrição mudarem. */
  onChanged: () => Promise<void>;
}

const BIO_MAX = 160;

function molduraCountOf(status: MolduraStatusResponse, moldura: MolduraId): number | null {
  if (moldura === 'ouro') return status.first;
  if (moldura === 'prata') return status.second;
  if (moldura === 'bronze') return status.third;
  return null; // Secret (especial) não mostra mais contador.
}

const MOLDURA_OPTIONS: MolduraId[] = ['bronze', 'prata', 'ouro', 'especial'];

/** Rascunho da borda selecionada — só vira mudança real ao clicar em Salvar. */
type BordaDraft =
  | { fonte: 'nenhuma' }
  | { fonte: 'podio'; moldura: MolduraId }
  | { fonte: 'loja'; itemId: string };

function bordaDraftEquals(a: BordaDraft, b: BordaDraft): boolean {
  if (a.fonte !== b.fonte) return false;
  if (a.fonte === 'podio' && b.fonte === 'podio') return a.moldura === b.moldura;
  if (a.fonte === 'loja' && b.fonte === 'loja') return a.itemId === b.itemId;
  return true;
}

export function ProfileEditModal({ open, profile, onClose, onChanged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.nome);
  const [bioDraft, setBioDraft] = useState(profile.descricao ?? '');
  const [molduras, setMolduras] = useState<MolduraStatusResponse | null>(null);
  const [catalog, setCatalog] = useState<ShopResponse | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  /** undefined = sem mudança; string = nova foto (data URL); null = remover. */
  const [pendingPhoto, setPendingPhoto] = useState<string | null | undefined>(undefined);
  const [tituloDraft, setTituloDraft] = useState<string | null>(null);
  const [bordaDraft, setBordaDraft] = useState<BordaDraft>({ fonte: 'nenhuma' });

  useEffect(() => {
    if (!open) return;
    setNameDraft(profile.nome);
    setBioDraft(profile.descricao ?? '');
    setCropFile(null);
    setPendingPhoto(undefined);
    setTituloDraft(profile.cosmeticos?.titulo_equipado ?? null);

    const currentBorder = resolveIdentityBorder(profile.cosmeticos);
    setBordaDraft(
      currentBorder.moldura
        ? { fonte: 'podio', moldura: currentBorder.moldura }
        : currentBorder.borderLoja
          ? { fonte: 'loja', itemId: currentBorder.borderLoja }
          : { fonte: 'nenhuma' },
    );

    let cancelled = false;
    getMolduraStatus()
      .then((status) => {
        if (!cancelled) setMolduras(status);
      })
      .catch(() => {
        /* molduras são opcionais — falha silenciosa não bloqueia a edição */
      });
    getShop()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        /* catálogo de cosméticos é opcional — o restante da edição funciona */
      });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKeyDown);
    };
    // Só reinicializa o rascunho na transição fechado→aberto. `onClose` é uma
    // arrow function inline no pai (nova referência a cada render) e
    // `profile` pode mudar em segundo plano (polling/social) — incluí-los
    // aqui faria o efeito rodar de novo com o modal já aberto e apagar o que
    // o usuário está digitando (bug: descrição "não salvava" na 1ª tentativa
    // porque o rascunho voltava pro valor antigo antes do clique em Salvar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handlePhotoFile = (file: File | undefined) => {
    if (file) setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayedAvatarUrl = pendingPhoto === undefined ? profile.avatar_url : pendingPhoto;
  const nameChanged = nameDraft.trim() !== profile.nome;
  const bioChanged = bioDraft.trim() !== (profile.descricao ?? '');
  const photoChanged =
    pendingPhoto !== undefined && (pendingPhoto !== null || Boolean(profile.avatar_url));
  const nameChangeIsPaid = (profile.nome_trocas ?? 0) > 0;

  const identityBorder = resolveIdentityBorder(profile.cosmeticos);
  const currentBordaDraft: BordaDraft = identityBorder.moldura
    ? { fonte: 'podio', moldura: identityBorder.moldura }
    : identityBorder.borderLoja
      ? { fonte: 'loja', itemId: identityBorder.borderLoja }
      : { fonte: 'nenhuma' };
  const bordaChanged = !bordaDraftEquals(bordaDraft, currentBordaDraft);

  const currentTituloId = profile.cosmeticos?.titulo_equipado ?? null;
  const tituloChanged = tituloDraft !== currentTituloId;

  const anythingChanged =
    nameChanged || bioChanged || photoChanged || bordaChanged || tituloChanged;

  const handleSave = async () => {
    const nome = nameDraft.trim();
    if (nameChanged && (nome.length < NOME_MIN_LENGTH || nome.length > NOME_MAX_LENGTH)) {
      showGameToast(
        `Nome deve ter entre ${NOME_MIN_LENGTH} e ${NOME_MAX_LENGTH} caracteres.`,
        { variant: 'error' },
      );
      return;
    }

    setSaving(true);
    try {
      if (photoChanged) {
        if (pendingPhoto) await uploadProfilePhoto(pendingPhoto);
        else await removeProfilePhoto();
      }
      if (nameChanged) {
        const result = await changeName(nome);
        if (result.custo_pago > 0) {
          showGameToast(
            `Nome alterado (-${result.custo_pago.toLocaleString('pt-BR')} ${CURRENCY_NAME}).`,
            { variant: 'success' },
          );
        }
      }
      if (bioChanged) {
        await updateMe({ descricao: bioDraft.trim() || null });
      }
      if (bordaChanged) {
        if (bordaDraft.fonte === 'loja') {
          await equipShopItem('moldura_loja', bordaDraft.itemId);
        } else {
          await equipMoldura(bordaDraft.fonte === 'podio' ? bordaDraft.moldura : null);
        }
      }
      if (tituloChanged && tituloDraft) {
        await equipShopItem('titulo', tituloDraft);
      }
      if (bordaChanged || tituloChanged) playEquip();
      await onChanged();
      onClose();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  type BordaOption = {
    key: string;
    draft: BordaDraft;
    unlocked: boolean;
    label: string;
    lockHint: string;
  } & (
    | { kind: 'podio'; moldura: MolduraId; count: number | null }
    | { kind: 'loja'; itemId: string }
  );

  const podioOptions: BordaOption[] = MOLDURA_OPTIONS.map((moldura) => ({
    key: `podio-${moldura}`,
    kind: 'podio',
    draft: { fonte: 'podio', moldura },
    moldura,
    count: molduras ? molduraCountOf(molduras, moldura) : null,
    unlocked: molduras?.desbloqueadas.includes(moldura) ?? false,
    label: MOLDURA_LABELS[moldura],
    lockHint:
      moldura === 'especial'
        ? 'Desbloqueie com um item secreto do jogo'
        : 'Feche uma semana no pódio pra desbloquear',
  }));

  const lojaOptions: BordaOption[] = (catalog?.molduras_loja ?? [])
    .filter((item) => item.id !== 'borda_basica')
    .map((item) => ({
      key: `loja-${item.id}`,
      kind: 'loja',
      draft: { fonte: 'loja', itemId: item.id },
      itemId: item.id,
      unlocked: item.desbloqueada,
      label: item.nome,
      lockHint: `Como conseguir: ${item.unlock_label}`,
    }));

  const bordaOptions = [...podioOptions, ...lojaOptions].sort(
    (a, b) => Number(b.unlocked) - Number(a.unlocked),
  );

  return createPortal(
    <div className="game-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="game-modal profile-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="profile-edit-modal__head">
          <h2 id="profile-edit-title">Editar perfil</h2>
          <button type="button" className="profile-edit-modal__close" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="profile-edit-modal__body">
          <div className="profile-edit-photo">
            <button
              type="button"
              className="profile-edit-photo__btn"
              disabled={saving}
              onClick={() => fileInputRef.current?.click()}
              aria-label={profile.avatar_url ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
            >
              <UserAvatar
                nome={profile.nome}
                avatarUrl={displayedAvatarUrl}
                moldura={bordaDraft.fonte === 'podio' ? bordaDraft.moldura : null}
                borderLoja={bordaDraft.fonte === 'loja' ? bordaDraft.itemId : null}
                molduraCount={
                  molduras && bordaDraft.fonte === 'podio'
                    ? molduraCountOf(molduras, bordaDraft.moldura)
                    : null
                }
                size="lg"
              />
              <span className="profile-edit-photo__badge" aria-hidden>
                <Camera size={13} />
              </span>
            </button>
            {displayedAvatarUrl && (
              <button
                type="button"
                className="profile-edit-photo__remove"
                disabled={saving}
                onClick={() => setPendingPhoto(null)}
              >
                <Trash2 size={12} aria-hidden />
                Remover foto
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handlePhotoFile(e.target.files?.[0])}
            />
          </div>

          <label className="profile-edit-field">
            <span className="profile-edit-field__label">Nome</span>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={NOME_MAX_LENGTH}
              className="profile-edit-field__input"
            />
            <span className="profile-edit-field__hint profile-edit-field__hint--count">
              {nameDraft.length}/{NOME_MAX_LENGTH}
            </span>
            {nameChanged && nameChangeIsPaid && (
              <span className="profile-edit-field__hint">
                Trocar o nome custa {NAME_CHANGE_COST.toLocaleString('pt-BR')} {CURRENCY_NAME}.
              </span>
            )}
          </label>

          <label className="profile-edit-field">
            <span className="profile-edit-field__label">Descrição</span>
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value.slice(0, BIO_MAX))}
              rows={3}
              maxLength={BIO_MAX}
              placeholder="Conte algo sobre você..."
              className="profile-edit-field__input profile-edit-field__input--area"
            />
            <span className="profile-edit-field__hint profile-edit-field__hint--count">
              {bioDraft.length}/{BIO_MAX}
            </span>
          </label>

          <CosmeticScrollPicker
            label="Título"
            hint="Títulos vêm de conquistas, códigos e eventos. Toque para escolher."
            items={catalog?.titulos}
            selectedId={tituloDraft}
            onSelect={(item) => setTituloDraft(item.id)}
            styledTitle
            simple
          />

          <div className="profile-edit-field">
            <span className="profile-edit-field__label">Bordas de Perfil</span>
            <span className="profile-edit-field__hint">
              Bordas de pódio e de conquista, desbloqueadas primeiro. Escolha e toque em Salvar.
            </span>
            <div className="profile-edit-molduras">
              <button
                type="button"
                className={`profile-moldura-option${bordaDraft.fonte === 'nenhuma' ? ' profile-moldura-option--active' : ''}`}
                onClick={() => setBordaDraft({ fonte: 'nenhuma' })}
              >
                <UserAvatar nome={profile.nome} avatarUrl={profile.avatar_url} size="sm" />
                <span>Nenhuma</span>
              </button>

              {bordaOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`profile-moldura-option${bordaDraftEquals(bordaDraft, option.draft) ? ' profile-moldura-option--active' : ''}`}
                  disabled={!option.unlocked}
                  onClick={() => setBordaDraft(option.draft)}
                  title={option.unlocked ? option.label : option.lockHint}
                >
                  <span className="profile-moldura-option__preview">
                    <UserAvatar
                      nome={profile.nome}
                      avatarUrl={profile.avatar_url}
                      moldura={option.kind === 'podio' ? option.moldura : null}
                      molduraCount={option.kind === 'podio' && option.unlocked ? option.count : null}
                      borderLoja={option.kind === 'loja' ? option.itemId : null}
                      size="sm"
                    />
                    {!option.unlocked && (
                      <span className="profile-moldura-option__lock" aria-hidden>
                        <Lock size={12} />
                      </span>
                    )}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="profile-edit-modal__footer">
          <GameButton variant="secondary" className="!w-auto px-4" onClick={onClose}>
            Cancelar
          </GameButton>
          <GameButton
            className="!w-auto px-5"
            disabled={saving || !anythingChanged}
            onClick={() => void handleSave()}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </GameButton>
        </footer>
      </div>

      {cropFile && (
        <PhotoCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(dataUrl) => {
            setPendingPhoto(dataUrl);
            setCropFile(null);
          }}
        />
      )}
    </div>,
    document.body,
  );
}
