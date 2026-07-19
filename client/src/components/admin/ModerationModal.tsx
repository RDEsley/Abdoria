import { useState } from 'react';
import { Ban, Clock3, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { banAdminUser, unbanAdminUser } from '@/lib/api';
import type { Banimento } from '@/types';

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  banimento: Banimento | null;
  onClose: () => void;
  /** Chamado após aplicar/remover punição, com o novo estado. */
  onChanged: (banimento: Banimento | null) => void;
}

/** Punições estilo Discord: suspensão com prazo ou banimento permanente. */
export function ModerationModal({ open, userId, userName, banimento, onClose, onChanged }: Props) {
  const [tipo, setTipo] = useState<'suspensao' | 'ban'>('suspensao');
  const [motivo, setMotivo] = useState('');
  const [dias, setDias] = useState(7);
  const [busy, setBusy] = useState(false);

  const aplicar = async () => {
    if (!motivo.trim()) {
      showGameToast('Informe o motivo da punição.', { variant: 'warn' });
      return;
    }
    setBusy(true);
    try {
      const res = await banAdminUser(userId, {
        tipo,
        motivo: motivo.trim(),
        ...(tipo === 'suspensao' ? { dias } : {}),
      });
      onChanged(res.user.banimento);
      showGameToast(
        tipo === 'ban' ? `${userName} foi banido.` : `${userName} suspenso por ${dias} dia(s).`,
        { variant: 'success' },
      );
      setMotivo('');
      onClose();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível aplicar a punição.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const remover = async () => {
    setBusy(true);
    try {
      const res = await unbanAdminUser(userId);
      onChanged(res.user.banimento);
      showGameToast(`Punição de ${userName} removida.`, { variant: 'success' });
      onClose();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível remover a punição.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="moderation-title">
      <h2 id="moderation-title" className="text-base font-extrabold text-stone-800">
        Moderar {userName}
      </h2>

      {banimento ? (
        <>
          <p className="mt-3 rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
            {banimento.tipo === 'ban'
              ? 'Banimento permanente'
              : `Suspenso até ${banimento.ate ? new Date(banimento.ate).toLocaleDateString('pt-BR') : '—'}`}
            <span className="mt-1 block text-xs font-semibold text-rose-700">
              Motivo: {banimento.motivo} · por {banimento.aplicado_por}
            </span>
          </p>
          <GameButton
            className="mt-4 flex w-full items-center justify-center gap-2"
            disabled={busy}
            onClick={() => void remover()}
          >
            <ShieldCheck size={16} /> Remover punição
          </GameButton>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo('suspensao')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-bold ${
                tipo === 'suspensao' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-stone-200'
              }`}
            >
              <Clock3 size={15} /> Suspender
            </button>
            <button
              type="button"
              onClick={() => setTipo('ban')}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-bold ${
                tipo === 'ban' ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-stone-200'
              }`}
            >
              <Ban size={15} /> Banir
            </button>
          </div>

          {tipo === 'suspensao' && (
            <label className="mt-3 block text-sm font-semibold">
              Duração: {dias} dia{dias === 1 ? '' : 's'}
              <input
                type="range"
                min={1}
                max={90}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="mt-1 w-full cursor-pointer"
              />
            </label>
          )}

          <label className="mt-3 block text-sm font-semibold">
            Motivo
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="Explique o motivo — o usuário verá isso ao tentar entrar."
              className="mt-1 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500"
            />
          </label>

          <GameButton
            className="mt-4 w-full"
            variant="danger"
            disabled={busy}
            onClick={() => void aplicar()}
          >
            {busy ? 'Aplicando...' : tipo === 'ban' ? 'Banir permanentemente' : 'Aplicar suspensão'}
          </GameButton>
        </>
      )}
    </Modal>
  );
}
