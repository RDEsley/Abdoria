import { useEffect, useState } from 'react';
import { Bell, Flame, Snowflake, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { updateMe } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const SESSION_KEY = 'abdoria_notif_prompt_seen';
const SHOW_DELAY_MS = 1600;

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Opt-in de notificações do navegador — aparece uma vez por sessão, algum
 * tempo depois do jogador chegar na Home (pós-login/cadastro). "Aceitar"
 * dispara o prompt nativo do navegador; "Não perguntar novamente" grava a
 * preferência na conta; "Agora não" só adia pra próxima sessão.
 */
export function NotificationOptInPrompt() {
  const { user, applyUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  const eligible =
    !dismissed &&
    !!user &&
    notificationsSupported() &&
    Notification.permission === 'default' &&
    !user.preferencias?.notificacoes_opt_out;

  useEffect(() => {
    if (!eligible) return undefined;
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [eligible]);

  if (!visible) return null;

  const closeForSession = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setDismissed(true);
    setVisible(false);
  };

  const aceitar = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showGameToast('Notificações ativadas! Vamos te avisar na hora certa. 🔔', {
          variant: 'success',
        });
      }
    } catch {
      /* navegador sem suporte completo — segue sem quebrar o fluxo */
    } finally {
      closeForSession();
    }
  };

  const neverAskAgain = async () => {
    closeForSession();
    try {
      const updated = await updateMe({
        preferencias: { ...user!.preferencias, notificacoes_opt_out: true },
      });
      applyUser(updated);
    } catch {
      /* melhor esforço — a sessão já silenciou */
    }
  };

  return (
    <Modal open onClose={closeForSession} labelledBy="notif-prompt-title">
      <div className="text-center">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600"
          aria-hidden
        >
          <Bell size={24} />
        </span>
        <h2 id="notif-prompt-title" className="mt-3 text-lg font-extrabold text-stone-900">
          Ativar notificações?
        </h2>
        <p className="mt-1 text-sm font-medium text-stone-500">
          A gente avisa só o essencial, na hora certa — sem spam.
        </p>

        <ul className="mt-4 flex flex-col gap-2.5 text-left">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Flame size={14} />
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Lembrete quando faltar pouco pro dia virar e sua sequência zerar
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Snowflake size={14} />
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Aviso quando seu estoque de Frozen Streak estiver acabando
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Sparkles size={14} />
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Novidades: conquistas, eventos e recompensas especiais
            </span>
          </li>
        </ul>

        <GameButton className="mt-5 w-full" onClick={() => void aceitar()}>
          Ativar notificações
        </GameButton>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            className="cursor-pointer text-xs font-bold text-stone-500 hover:text-stone-700"
            onClick={closeForSession}
          >
            Agora não
          </button>
          <button
            type="button"
            className="cursor-pointer text-xs font-bold text-stone-400 hover:text-stone-600"
            onClick={() => void neverAskAgain()}
          >
            Não perguntar novamente
          </button>
        </div>
      </div>
    </Modal>
  );
}
