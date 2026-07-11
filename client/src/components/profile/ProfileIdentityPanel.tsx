import { useEffect, useRef, useState } from 'react';
import { Camera, Lock, Pencil, Trash2 } from 'lucide-react';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import {
  changeName,
  equipMoldura,
  getMolduraStatus,
  removeProfilePhoto,
  uploadProfilePhoto,
  type MolduraStatusResponse,
} from '@/lib/api';
import {
  CURRENCY_NAME,
  MOLDURA_LABELS,
  NAME_CHANGE_COST,
  type IUserDocument,
  type MolduraId,
} from '@/types';

interface Props {
  profile: IUserDocument;
  /** Recarrega usuário/app depois de foto, nome ou moldura mudarem. */
  onChanged: () => Promise<void>;
}

const PHOTO_SIZE = 512;

/** Reduz e recorta a foto num quadrado JPEG pequeno antes do upload. */
async function compressPhotoToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE,
  );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

function molduraCountOf(status: MolduraStatusResponse, moldura: MolduraId): number {
  if (moldura === 'ouro') return status.first;
  if (moldura === 'prata') return status.second;
  if (moldura === 'bronze') return status.third;
  return status.secret_items;
}

const MOLDURA_OPTIONS: MolduraId[] = ['bronze', 'prata', 'ouro', 'especial'];

export function ProfileIdentityPanel({ profile, onChanged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.nome);
  const [molduras, setMolduras] = useState<MolduraStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMolduraStatus()
      .then((status) => {
        if (!cancelled) setMolduras(status);
      })
      .catch(() => {
        /* molduras são opcionais — falha silenciosa não bloqueia o perfil */
      });
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

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

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    await run(async () => {
      const dataUrl = await compressPhotoToDataUrl(file);
      await uploadProfilePhoto(dataUrl);
    }, 'Foto de perfil atualizada!');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const nameChangeIsFree = (profile.nome_trocas ?? 0) === 0;

  const handleNameSubmit = async () => {
    const nome = nameDraft.trim();
    if (nome.length < 2) {
      showGameToast('Nome deve ter pelo menos 2 caracteres.', { variant: 'error' });
      return;
    }
    if (nome === profile.nome) {
      setEditingName(false);
      return;
    }
    await run(async () => {
      const result = await changeName(nome);
      if (result.custo_pago > 0) {
        showGameToast(
          `Nome alterado (-${result.custo_pago.toLocaleString('pt-BR')} ${CURRENCY_NAME}).`,
          { variant: 'success' },
        );
      }
    });
    setEditingName(false);
  };

  const equipada = molduras?.equipada ?? profile.cosmeticos?.moldura_equipada ?? null;

  return (
    <section className="glass-card flex flex-col gap-4 p-4" aria-label="Identidade do perfil">
      <div className="flex items-center gap-4">
        <UserAvatar
          nome={profile.nome}
          avatarUrl={profile.avatar_url}
          moldura={equipada}
          molduraCount={molduras && equipada ? molduraCountOf(molduras, equipada) : null}
          size="lg"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <GameButton
              variant="secondary"
              className="flex items-center gap-1.5 !w-auto px-3 py-2 text-xs"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={14} aria-hidden />
              {profile.avatar_url ? 'Trocar foto' : 'Adicionar foto'}
            </GameButton>
            {profile.avatar_url && (
              <GameButton
                variant="ghost"
                className="flex items-center gap-1.5 !w-auto px-3 py-2 text-xs"
                disabled={busy}
                onClick={() => void run(() => removeProfilePhoto(), 'Foto removida.')}
              >
                <Trash2 size={14} aria-hidden />
                Remover
              </GameButton>
            )}
          </div>
          <p className="text-xs font-medium text-stone-500">
            Sem foto, seu círculo mostra a inicial do nome.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void handlePhotoFile(e.target.files?.[0])}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-stone-700">Nome</span>
        {editingName ? (
          <div className="flex gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={40}
              className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 font-medium"
            />
            <GameButton
              className="!w-auto px-3 py-2 text-xs"
              disabled={busy}
              onClick={() => void handleNameSubmit()}
            >
              Salvar
            </GameButton>
            <GameButton
              variant="ghost"
              className="!w-auto px-3 py-2 text-xs"
              onClick={() => {
                setNameDraft(profile.nome);
                setEditingName(false);
              }}
            >
              Cancelar
            </GameButton>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-extrabold text-stone-800">{profile.nome}</span>
            <GameButton
              variant="ghost"
              className="flex items-center gap-1.5 !w-auto px-3 py-2 text-xs"
              onClick={() => setEditingName(true)}
            >
              <Pencil size={13} aria-hidden />
              Trocar nome
            </GameButton>
          </div>
        )}
        <p className="text-xs font-medium text-stone-500">
          {nameChangeIsFree
            ? 'Primeira troca de nome é grátis.'
            : `Trocar de novo custa ${NAME_CHANGE_COST.toLocaleString('pt-BR')} ${CURRENCY_NAME}.`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-stone-700">Moldura</span>
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            className={`profile-moldura-option${equipada == null ? ' profile-moldura-option--active' : ''}`}
            disabled={busy}
            onClick={() => void run(() => equipMoldura(null))}
          >
            <UserAvatar nome={profile.nome} avatarUrl={profile.avatar_url} size="sm" />
            <span>Nenhuma</span>
          </button>
          {MOLDURA_OPTIONS.map((moldura) => {
            const unlocked = molduras?.desbloqueadas.includes(moldura) ?? false;
            const count = molduras ? molduraCountOf(molduras, moldura) : 0;
            return (
              <button
                key={moldura}
                type="button"
                className={`profile-moldura-option${equipada === moldura ? ' profile-moldura-option--active' : ''}`}
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
        </div>
        <p className="text-xs font-medium text-stone-500">
          Bronze, Prata e Ouro vêm de pódios no fechamento semanal do ranking. A Especial vem de
          itens secretos.
        </p>
      </div>
    </section>
  );
}
