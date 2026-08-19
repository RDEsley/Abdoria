import { useEffect, useState } from 'react';
import { Bug, Mail, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { submitAppSuggestion } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SUPPORT_EMAIL = 'fateeightcontato@gmail.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reportar bug/sugestão a partir do perfil — vai pro painel do ADM + contato direto. */
export function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, applyUser } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome((prev) => prev || user?.nome || '');
    setEmail((prev) => prev || user?.email || '');
  }, [open, user?.nome, user?.email]);

  const nomeValido = nome.trim().length >= 2;
  const emailValido = EMAIL_REGEX.test(email.trim());
  const podeEnviar = nomeValido && emailValido && texto.trim().length >= 5;

  const enviar = async () => {
    if (!podeEnviar) {
      showGameToast('Preencha nome, e-mail e conte com um pouco mais de detalhe. 😊', {
        variant: 'warn',
      });
      return;
    }
    setBusy(true);
    try {
      const res = await submitAppSuggestion(texto.trim());
      applyUser(res.user);
      setTexto('');
      showGameToast('Enviado! Obrigado por ajudar a melhorar o Evolyn. 💚', {
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
      <button type="button" onClick={onClose} aria-label="Fechar" className="support-modal__close">
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
        <p className="mt-1.5 text-center text-sm font-medium leading-snug text-stone-500">
          Encontrou um problema ou tem uma ideia? Conta pra gente — sua mensagem chega direto pra
          quem desenvolve o app.
        </p>

        <div className="mt-4 flex flex-col gap-2 text-left sm:flex-row">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value.slice(0, 80))}
            placeholder="Seu nome"
            className="w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-left text-sm font-medium outline-none focus:border-emerald-500"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 120))}
            placeholder="Seu e-mail"
            className="w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-left text-sm font-medium outline-none focus:border-emerald-500"
          />
        </div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 800))}
          rows={4}
          placeholder="Descreva o bug ou sua sugestão..."
          className="mt-2 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-left text-sm font-medium outline-none focus:border-emerald-500"
        />
        <p className="mt-1 text-right text-[0.62rem] font-semibold text-stone-400">
          {texto.length}/800
        </p>

        <GameButton
          className="mt-2 flex w-full items-center justify-center"
          disabled={busy || !podeEnviar}
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
        </div>
      </div>
    </Modal>
  );
}
