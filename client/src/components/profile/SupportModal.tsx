import { useEffect, useState } from 'react';
import { Bug, Mail, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { submitSupportMessage, type SupportKind } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { getRunningRelease } from '@/lib/app-release';

const SUPPORT_EMAIL = 'fateeightcontato@gmail.com';

const KIND_OPTIONS: Array<{ id: SupportKind; label: string }> = [
  { id: 'bug', label: 'Bug' },
  { id: 'suggestion', label: 'Sugestão' },
  { id: 'feedback', label: 'Feedback' },
];

/** Reportar bug/sugestão a partir do perfil — vai pro painel do ADM + contato direto. */
export function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, applyUser } = useAuth();
  const [kind, setKind] = useState<SupportKind>('bug');
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind('bug');
    setTexto('');
  }, [open]);

  const podeEnviar = texto.trim().length >= 5;

  const enviar = async () => {
    if (!podeEnviar) {
      showGameToast('Conte com um pouco mais de detalhe. 😊', { variant: 'warn' });
      return;
    }
    setBusy(true);
    try {
      const release = getRunningRelease();
      const res = await submitSupportMessage(kind, texto.trim(), {
        route: typeof window !== 'undefined' ? window.location.pathname : undefined,
        release: release.version,
        build: release.build,
        platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
      });
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
          Fale com o Evolyn
        </h2>
        <p className="mt-1.5 text-center text-sm font-medium leading-snug text-stone-500">
          Encontrou um problema ou tem uma ideia? Conta pra gente — sua mensagem chega direto pra
          quem desenvolve o app.
        </p>

        {user ? (
          <p className="mt-3 text-xs font-semibold text-stone-500">
            Enviando como <span className="text-stone-800">{user.nome}</span>
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setKind(option.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                kind === option.id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-stone-200 bg-white text-stone-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 800))}
          rows={4}
          placeholder="Descreva o bug, sugestão ou feedback..."
          className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-sm font-medium outline-none focus:border-emerald-500"
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
