import { useState } from 'react';
import { Bug, Mail, MessageCircle, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { submitAppSuggestion } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SUPPORT_EMAIL = 'fateeightcontato@gmail.com';
const SUPPORT_WHATSAPP_DISPLAY = '(61) 99044-8973';
const SUPPORT_WHATSAPP_LINK = 'https://wa.me/5561990448973';

/** Reportar bug/sugestão a partir do perfil — vai pro painel do ADM + contato direto. */
export function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { applyUser } = useAuth();
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);

  const enviar = async () => {
    if (texto.trim().length < 5) {
      showGameToast('Conta pra gente com um pouco mais de detalhe. 😊', { variant: 'warn' });
      return;
    }
    setBusy(true);
    try {
      const res = await submitAppSuggestion(texto.trim());
      applyUser(res.user);
      setTexto('');
      showGameToast('Enviado! Obrigado por ajudar a melhorar o Abdoria. 💚', {
        variant: 'success',
      });
      onClose();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível enviar.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="support-modal-title">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="support-modal__close"
      >
        <X size={18} aria-hidden />
      </button>

      <div className="text-center">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"
          aria-hidden
        >
          <Bug size={24} />
        </span>
        <h2 id="support-modal-title" className="mt-3 text-lg font-extrabold text-stone-900">
          Reportar bug ou sugestão
        </h2>
        <p className="mt-1 text-sm font-medium text-stone-500">
          Encontrou um problema ou tem uma ideia? Conta pra gente — sua mensagem chega direto pra
          quem desenvolve o app.
        </p>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 800))}
          rows={4}
          placeholder="Descreva o bug ou sua sugestão..."
          className="mt-4 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-left text-sm font-medium outline-none focus:border-emerald-500"
        />
        <p className="mt-1 text-right text-[0.62rem] font-semibold text-stone-400">
          {texto.length}/800
        </p>

        <GameButton
          className="mt-2 flex w-full items-center justify-center"
          disabled={busy || texto.trim().length < 5}
          onClick={() => void enviar()}
        >
          {busy ? 'Enviando...' : 'Enviar mensagem'}
        </GameButton>

        <div className="support-modal__divider">
          <span>ou fale direto com o suporte</span>
        </div>

        <div className="support-modal__contacts">
          <a className="support-modal__contact" href={`mailto:${SUPPORT_EMAIL}`}>
            <span className="support-modal__contact-icon" aria-hidden>
              <Mail size={16} />
            </span>
            <span className="support-modal__contact-text">
              <strong>E-mail</strong>
              <small>{SUPPORT_EMAIL}</small>
            </span>
          </a>
          <a
            className="support-modal__contact"
            href={SUPPORT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="support-modal__contact-icon support-modal__contact-icon--whats" aria-hidden>
              <MessageCircle size={16} />
            </span>
            <span className="support-modal__contact-text">
              <strong>WhatsApp</strong>
              <small>{SUPPORT_WHATSAPP_DISPLAY}</small>
            </span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
