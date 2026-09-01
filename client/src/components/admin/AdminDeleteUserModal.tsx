import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { deleteAdminUser } from '@/lib/api/admin';

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
  onDeleted: () => void;
}

type Step = 'confirm-phrase' | 'final';

/** Exclusão de conta por um admin — mesmo padrão de dupla confirmação de "Deletar minha conta". */
export function AdminDeleteUserModal({ open, userId, userName, onClose, onDeleted }: Props) {
  const [step, setStep] = useState<Step>('confirm-phrase');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    onClose();
    setTimeout(() => {
      setStep('confirm-phrase');
      setPhrase('');
    }, 200);
  };

  const confirmar = async () => {
    setBusy(true);
    try {
      await deleteAdminUser(userId);
      showGameToast(`Conta de ${userName} apagada.`, { variant: 'info' });
      onDeleted();
      close();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível apagar a conta.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={open && step === 'confirm-phrase'}
        onClose={close}
        labelledBy="admin-delete-phrase-title"
      >
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={20} aria-hidden />
          <h2 id="admin-delete-phrase-title" className="text-base font-extrabold text-stone-800">
            Apagar a conta de {userName}?
          </h2>
        </div>
        <p className="mt-2 text-sm font-medium text-stone-600">
          Isso apaga treinos, XP, streak, cosméticos e todo o resto dessa conta pra sempre — não dá
          pra desfazer. Pra confirmar, escreva <strong>tenho certeza</strong> no campo abaixo.
        </p>
        <input
          type="text"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="tenho certeza"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="game-input mt-3 w-full"
        />
        <div className="mt-4 flex justify-end gap-2">
          <GameButton variant="ghost" className="!w-auto px-4" onClick={close}>
            Cancelar
          </GameButton>
          <GameButton
            variant="danger"
            className="!w-auto px-5"
            disabled={phrase.trim().toLowerCase() !== 'tenho certeza'}
            onClick={() => setStep('final')}
          >
            Continuar
          </GameButton>
        </div>
      </Modal>

      <Modal open={open && step === 'final'} onClose={close} labelledBy="admin-delete-final-title">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={20} aria-hidden />
          <h2 id="admin-delete-final-title" className="text-base font-extrabold text-stone-800">
            Essa é a última chance
          </h2>
        </div>
        <p className="mt-2 text-sm font-medium text-stone-600">
          Ao confirmar, a conta de <strong>{userName}</strong> é apagada imediatamente e não pode
          ser recuperada.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GameButton variant="ghost" className="!w-auto px-4" disabled={busy} onClick={close}>
            Cancelar
          </GameButton>
          <GameButton
            variant="danger"
            className="!w-auto px-5"
            disabled={busy}
            onClick={() => void confirmar()}
          >
            {busy ? 'Apagando...' : 'Sim, apagar esta conta'}
          </GameButton>
        </div>
      </Modal>
    </>
  );
}
