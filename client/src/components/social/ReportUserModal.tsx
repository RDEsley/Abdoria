import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { reportUser } from '@/lib/api/social';
import { REPORT_MOTIVOS, REPORT_MOTIVO_LABELS, type ReportMotivo } from '@/types';

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

/** Denúncia de perfil — motivo + descrição opcional, um único envio por par até ser revisado. */
export function ReportUserModal({ open, userId, userName, onClose }: Props) {
  const [motivo, setMotivo] = useState<ReportMotivo | null>(null);
  const [descricao, setDescricao] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const close = () => {
    onClose();
    setTimeout(() => {
      setMotivo(null);
      setDescricao('');
      setSent(false);
    }, 200);
  };

  const enviar = async () => {
    if (!motivo || busy) return;
    setBusy(true);
    try {
      await reportUser(userId, motivo, descricao.trim() || undefined);
      setSent(true);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível enviar a denúncia.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} labelledBy="report-user-title">
      {sent ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="report-modal__sent-icon" aria-hidden>
            <Flag size={22} />
          </span>
          <h2 id="report-user-title" className="text-base font-extrabold text-stone-800">
            Denúncia enviada
          </h2>
          <p className="text-sm font-medium text-stone-600">
            Nossa equipe vai revisar o perfil de {userName}. Obrigado por ajudar a manter a
            comunidade segura.
          </p>
          <GameButton className="mt-2 !w-auto px-6" onClick={close}>
            Fechar
          </GameButton>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-rose-600">
            <Flag size={18} aria-hidden />
            <h2 id="report-user-title" className="text-base font-extrabold text-stone-800">
              Denunciar {userName}
            </h2>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-stone-500">
            Escolha o motivo que melhor descreve o problema. Denúncias falsas ou feitas de má-fé
            também podem ser punidas.
          </p>

          <div className="report-modal__reasons">
            {REPORT_MOTIVOS.map((option) => (
              <button
                key={option}
                type="button"
                className={`report-modal__reason${motivo === option ? ' report-modal__reason--active' : ''}`}
                onClick={() => setMotivo(option)}
                aria-pressed={motivo === option}
              >
                {REPORT_MOTIVO_LABELS[option]}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-sm font-semibold">
            Detalhes (opcional)
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Conte mais sobre o que aconteceu, se quiser."
              className="mt-1 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500"
            />
          </label>

          <GameButton
            className="mt-4 w-full"
            variant="danger"
            disabled={!motivo || busy}
            onClick={() => void enviar()}
          >
            {busy ? 'Enviando...' : 'Enviar denúncia'}
          </GameButton>
        </>
      )}
    </Modal>
  );
}
