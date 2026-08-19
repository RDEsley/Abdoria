import { useEffect, useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { submitAppRating, updateMe } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';

const SESSION_KEY = 'abdoria_rating_prompt_seen';

/**
 * Popup de avaliação: aparece uma vez quando o jogador chega a 3 dias de
 * streak. Enviar ou pedir pra não perguntar de novo grava nas preferências;
 * "Agora não" volta a perguntar em outra sessão.
 */
export function RatingPrompt() {
  const { user, applyUser } = useAuth();
  const { stats } = useApp();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  const eligibleNow =
    !dismissed &&
    !!user &&
    !user.preferencias?.avaliacao_respondida &&
    (stats?.streak_atual ?? 0) >= 3;

  // Trava a decisão de mostrar uma vez satisfeita — sem isso, qualquer
  // atualização passageira de `stats`/`user` em segundo plano (poll do AFK,
  // refresh de contexto) recalculava `shouldShow` a cada render e podia
  // desmontar o modal no meio da digitação, apagando o comentário.
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
        preferencias: { ...user.preferencias, avaliacao_respondida: true },
      });
      applyUser(updated);
    } catch {
      /* melhor esforço — a sessão já silenciou */
    }
  };

  const enviar = async () => {
    if (stars < 1) {
      showGameToast('Escolha de 1 a 5 estrelas.', { variant: 'warn' });
      return;
    }
    setBusy(true);
    try {
      const res = await submitAppRating(stars, comment.trim() || undefined);
      applyUser(res.user);
      closeForSession();
      showGameToast('Valeu pela avaliação! 💚', { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível enviar.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={closeForSession} labelledBy="rating-prompt-title">
      <div className="text-center">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"
          aria-hidden
        >
          <Heart size={24} />
        </span>
        <h2 id="rating-prompt-title" className="mt-3 text-lg font-extrabold text-stone-900">
          3 dias seguidos — você está voando!
        </h2>
        <p className="mt-1 text-sm font-medium text-stone-500">
          Está gostando do Evolyn? Sua avaliação ajuda a gente a melhorar.
        </p>

        <div
          className="mt-4 flex justify-center gap-1"
          role="radiogroup"
          aria-label="Avaliação de 1 a 5 estrelas"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={stars === value}
              aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
              className="cursor-pointer p-1"
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(value)}
            >
              <Star
                size={30}
                className={value <= (hover || stars) ? 'text-amber-400' : 'text-stone-300'}
                fill={value <= (hover || stars) ? 'currentColor' : 'none'}
                aria-hidden
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Quer deixar um comentário? (opcional)"
          className="mt-3 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-left text-sm font-medium outline-none focus:border-emerald-500"
        />

        <GameButton
          className="mt-3 w-full"
          disabled={busy || stars < 1}
          onClick={() => void enviar()}
        >
          {busy ? 'Enviando...' : 'Enviar avaliação'}
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
