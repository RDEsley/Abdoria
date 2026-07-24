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
  type IUserDocument,
  type MolduraId,
  type ShopCatalogItem,
  type ShopResponse,
} from '@/types';

interface Props {
  open: boolean;
  profile: IUserDocument;
  onClose: () => void;
  /** Recarrega usuário/app depois de foto, nome, moldura ou descrição mudarem. */
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

export function ProfileEditModal({ open, profile, onClose, onChanged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.nome);
  const [bioDraft, setBioDraft] = useState(profile.descricao ?? '');
  const [molduras, setMolduras] = useState<MolduraStatusResponse | null>(null);
  const [catalog, setCatalog] = useState<ShopResponse | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  /** undefined = sem mudança; string = nova foto (data URL); null = remover. */
  const [pendingPhoto, setPendingPhoto] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setNameDraft(profile.nome);
    setBioDraft(profile.descricao ?? '');
    setCropFile(null);
    setPendingPhoto(undefined);

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

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await onChanged();
      if (successMessage) showGameToast(successMessage, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

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

  const handleSave = async () => {
    const nome = nameDraft.trim();
    if (nameChanged && nome.length < 2) {
      showGameToast('Nome deve ter pelo menos 2 caracteres.', { variant: 'error' });
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
      await onChanged();
      onClose();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const identityBorder = resolveIdentityBorder(profile.cosmeticos);
  const semBorda = identityBorder.moldura == null && !identityBorder.borderLoja;

  const handleEquipCosmetic = async (item: ShopCatalogItem) => {
    if (busyItemId) return;
    setBusyItemId(item.id);
    try {
      await equipShopItem(item.kind, item.id);
      playEquip();
      const data = await getShop();
      setCatalog(data);
      await onChanged();
      showGameToast(`${item.nome} equipado!`, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível equipar este item.'), {
        variant: 'error',
      });
    } finally {
      setBusyItemId(null);
    }
  };

  const molduraLojaOptions = (catalog?.molduras_loja ?? [])
    .filter((item) => item.id !== 'borda_basica')
    .sort((a, b) => Number(b.desbloqueada) - Number(a.desbloqueada));

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
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              aria-label={profile.avatar_url ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
            >
              <UserAvatar
                nome={profile.nome}
                avatarUrl={displayedAvatarUrl}
                moldura={identityBorder.moldura}
                borderLoja={identityBorder.borderLoja}
                molduraCount={
                  molduras && identityBorder.moldura
                    ? molduraCountOf(molduras, identityBorder.moldura)
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
                disabled={busy}
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
              maxLength={40}
              className="profile-edit-field__input"
            />
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
            busyItemId={busyItemId}
            onEquip={(item) => void handleEquipCosmetic(item)}
            styledTitle
          />

          <CosmeticScrollPicker
            label="Efeito de celebração"
            hint="Muda o efeito das suas vitórias."
            items={catalog?.efeitos}
            busyItemId={busyItemId}
            onEquip={(item) => void handleEquipCosmetic(item)}
          />

          <div className="profile-edit-field">
            <span className="profile-edit-field__label">Bordas de Perfil</span>
            <span className="profile-edit-field__hint">
              Bordas de pódio e de conquista. Toque numa desbloqueada para equipar.
            </span>
            <div className="profile-edit-molduras">
              <button
                type="button"
                className={`profile-moldura-option${semBorda ? ' profile-moldura-option--active' : ''}`}
                disabled={busy}
                onClick={() => void run(() => equipMoldura(null))}
              >
                <UserAvatar nome={profile.nome} avatarUrl={profile.avatar_url} size="sm" />
                <span>Nenhuma</span>
              </button>

              {[...MOLDURA_OPTIONS]
                .sort((a, b) => {
                  const aUnlocked = molduras?.desbloqueadas.includes(a) ?? false;
                  const bUnlocked = molduras?.desbloqueadas.includes(b) ?? false;
                  if (aUnlocked === bUnlocked) return 0;
                  return aUnlocked ? -1 : 1;
                })
                .map((moldura) => {
                  const unlocked = molduras?.desbloqueadas.includes(moldura) ?? false;
                  const count = molduras ? molduraCountOf(molduras, moldura) : null;
                  return (
                    <button
                      key={moldura}
                      type="button"
                      className={`profile-moldura-option${identityBorder.moldura === moldura ? ' profile-moldura-option--active' : ''}`}
                      disabled={busy || !unlocked}
                      onClick={() => void run(() => equipMoldura(moldura))}
                      title={
                        unlocked
                          ? MOLDURA_LABELS[moldura]
                          : moldura === 'especial'
                            ? 'Desbloqueie com um item secreto do jogo'
                            : 'Feche uma semana no pódio pra desbloquear'
                      }
                    >
                      <span className="profile-moldura-option__preview">
                        <UserAvatar
                          nome={profile.nome}
                          avatarUrl={profile.avatar_url}
                          moldura={moldura}
                          molduraCount={unlocked ? count : null}
                          size="sm"
                        />
                        {!unlocked && (
                          <span className="profile-moldura-option__lock" aria-hidden>
                            <Lock size={12} />
                          </span>
                        )}
                      </span>
                      <span>{MOLDURA_LABELS[moldura]}</span>
                    </button>
                  );
                })}

              {molduraLojaOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`profile-moldura-option${identityBorder.borderLoja === item.id ? ' profile-moldura-option--active' : ''}`}
                  disabled={busy || busyItemId != null || !item.desbloqueada}
                  onClick={() => void handleEquipCosmetic(item)}
                  title={item.desbloqueada ? item.nome : `Como conseguir: ${item.unlock_label}`}
                >
                  <span className="profile-moldura-option__preview">
                    <UserAvatar
                      nome={profile.nome}
                      avatarUrl={profile.avatar_url}
                      borderLoja={item.id}
                      size="sm"
                    />
                    {!item.desbloqueada && (
                      <span className="profile-moldura-option__lock" aria-hidden>
                        <Lock size={12} />
                      </span>
                    )}
                  </span>
                  <span>{item.nome}</span>
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
            disabled={saving || busy || (!nameChanged && !bioChanged && !photoChanged)}
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
