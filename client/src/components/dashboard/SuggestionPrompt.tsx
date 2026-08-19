import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { submitAppSuggestion, updateMe } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';

const SESSION_KEY = 'abdoria_suggestion_prompt_seen';

/**
 * Popup de sugestão/opinião: aparece uma vez quando o jogador chega a 7 dias
 * de streak (a esta altura já conhece bem o app). O texto vai pro painel do
 * ADM. "Agora não" volta a perguntar em outra sessão.
 */
export function SuggestionPrompt() {
  const { user, applyUser } = useAuth();
  const { stats } = useApp();
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  // Não empilha com o popup de avaliação (streak 3): se a avaliação ainda está
  // pendente nesta sessão, a sugestão espera a próxima.
  const ratingPendente =
    !!user &&
    !user.preferencias?.avaliacao_respondida &&
    sessionStorage.getItem('abdoria_rating_prompt_seen') !== '1';

  const eligibleNow =
    !dismissed &&
    !!user &&
    !ratingPendente &&
    !user.preferencias?.sugestao_respondida &&
    (stats?.streak_atual ?? 0) >= 7;

  // Trava a decisão de mostrar uma vez satisfeita — sem isso, qualquer
  // atualização passageira de `stats`/`user` em segundo plano (poll do AFK,
  // refresh de contexto) recalculava `shouldShow` a cada render e podia
  // desmontar o modal no meio da digitação, apagando o texto.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (eligibleNow) setVisible(true);
  }, [eligibleNow]);

  if (!visible || !user) return null;

  const closeForSession = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setDismissed(true);
    setVisible(false);
  };

  const neverAskAgain = async () => {
    closeForSession();
    try {
      const updated = await updateMe({
        preferencias: { ...user.preferencias, sugestao_respondida: true },
      });
      applyUser(updated);
    } catch {
      /* melhor esforço — a sessão já silenciou */
    }
  };

  const enviar = async () => {
    if (texto.trim().length < 5) {
      showGameToast('Conta pra gente com um pouco mais de detalhe. 😊', { variant: 'warn' });
      return;
    }
    setBusy(true);
    try {
      const res = await submitAppSuggestion(texto.trim());
      applyUser(res.user);
      closeForSession();
      showGameToast('Sugestão enviada — obrigado por construir o Evolyn com a gente! 💚', {
        variant: 'success',
      });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível enviar.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={closeForSession} labelledBy="suggestion-prompt-title">
      <div className="text-center">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"
          aria-hidden
        >
          <Lightbulb size={24} />
        </span>
        <h2 id="suggestion-prompt-title" className="mt-3 text-lg font-extrabold text-stone-900">
          7 dias de sequência — você é veterano!
        </h2>
        <p className="mt-1 text-sm font-medium text-stone-500">
          O que está achando do Evolyn? Tem alguma ideia ou sugestão? Sua opinião chega direto pra
          quem desenvolve o app.
        </p>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 800))}
          rows={4}
          placeholder="Escreva sua sugestão, ideia ou opinião..."
          className="mt-4 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-left text-sm font-medium outline-none focus:border-emerald-500"
        />
        <p className="mt-1 text-right text-[0.62rem] font-semibold text-stone-400">
          {texto.length}/800
        </p>

        <GameButton
          className="mt-2 w-full"
          disabled={busy || texto.trim().length < 5}
          onClick={() => void enviar()}
        >
          {busy ? 'Enviando...' : 'Enviar sugestão'}
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
