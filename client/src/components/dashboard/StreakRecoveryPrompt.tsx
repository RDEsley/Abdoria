import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { recoverStreak } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { CURRENCY_NAME, resolveCosmeticos } from '@/types';
import { GameLeafIcon } from '@/components/ui/CurrencyIcon';

const SESSION_KEY = 'abdoria_streak_recovery_prompt_seen';

/**
 * Oferta de "Recuperar Streak" (estilo Duolingo): aparece quando o servidor
 * libera `stats.streak_recovery_offer` (streak perdido de verdade, sem Frozen
 * Streak, depois de 3 perdas na vida da conta — ver shared/streak/recovery.ts).
 * "Agora não" só fecha pra sessão atual: a oferta em si só some quando
 * resgatada ou quando o jogador reconstrói a sequência sozinho.
 */
export function StreakRecoveryPrompt() {
  const { user, applyUser } = useAuth();
  const { stats, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  const offer = stats?.streak_recovery_offer ?? null;
  const eligibleNow = !dismissed && !!user && !!offer;

  // Mesma trava da RatingPrompt: uma vez elegível, não desmonta se stats/user
  // atualizarem em segundo plano enquanto o jogador decide.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (eligibleNow) setVisible(true);
  }, [eligibleNow]);

  if (!visible || !user || !offer) return null;

  const cosmeticos = resolveCosmeticos(user.cosmeticos, user.gamificacao.nivel_xp);
  const saldo = cosmeticos.moedas;
  const podePagar = saldo >= offer.custo_coins;

  const closeForSession = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setDismissed(true);
    setVisible(false);
  };

  const recuperar = async () => {
    if (!podePagar || busy) return;
    setBusy(true);
    try {
      const res = await recoverStreak();
      applyUser(res.user);
      showGameToast(
        `Sequência de ${res.streak_atual} dia${res.streak_atual !== 1 ? 's' : ''} recuperada!`,
        { variant: 'success' },
      );
      setVisible(false);
      void refresh();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível recuperar a sequência.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={closeForSession} labelledBy="streak-recovery-title">
      <div className="text-center">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-500"
          aria-hidden
        >
          <Flame size={24} />
        </span>
        <h2 id="streak-recovery-title" className="mt-3 text-lg font-extrabold text-stone-900">
          Recupere sua sequência!
        </h2>
        <p className="mt-1 text-sm font-medium text-stone-500">
          Você perdeu uma sequência de{' '}
          <strong>
            {offer.dias_perdidos} dia{offer.dias_perdidos !== 1 ? 's' : ''}
          </strong>
          . Pague para voltar exatamente de onde parou.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
          <GameLeafIcon size={19} aria-hidden />
          <span className="text-lg font-extrabold text-amber-900">
            {offer.custo_coins} {CURRENCY_NAME}
          </span>
        </div>
        {!podePagar && (
          <p className="mt-2 text-xs font-bold text-red-500">
            Faltam {offer.custo_coins - saldo} {CURRENCY_NAME}.
          </p>
        )}

        <GameButton
          className="mt-4 w-full"
          disabled={busy || !podePagar}
          onClick={() => void recuperar()}
        >
          {busy ? 'Recuperando...' : `Recuperar por ${offer.custo_coins} ${CURRENCY_NAME}`}
        </GameButton>
        <button
          type="button"
          className="mt-2 cursor-pointer text-xs font-bold text-stone-500 hover:text-stone-700"
          onClick={closeForSession}
        >
          Agora não
        </button>
      </div>
    </Modal>
  );
}
