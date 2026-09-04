import { useMemo, useState } from 'react';
import { GiftCodeRewardReveal } from '@/components/settings/GiftCodeRewardReveal';
import { GameButton } from '@/components/ui/GameButton';
import { redeemGiftCode } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/lib/game-toast';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { type RedeemCodeResponse, resolveCosmeticos } from '@/types';
import { setSfxPack } from '@/lib/sounds';
import { emitXpEarned } from '@/lib/xp-orbs';
import { queueStreakUpCelebration } from '@/lib/home-celebrations';

const GIFT_CODE_PATTERN = /^[a-z0-9_-]+$/;
const GIFT_CODE_MIN_LENGTH = 3;
const GIFT_CODE_MAX_LENGTH = 32;

function normalizeGiftCodeInput(raw: string): string {
  return raw.trim().toLowerCase();
}

function validateGiftCodeInput(code: string): string | null {
  if (!code) return 'Informe o código presente.';
  if (code.length < GIFT_CODE_MIN_LENGTH || code.length > GIFT_CODE_MAX_LENGTH) {
    return `O código deve ter entre ${GIFT_CODE_MIN_LENGTH} e ${GIFT_CODE_MAX_LENGTH} caracteres.`;
  }
  if (!GIFT_CODE_PATTERN.test(code)) {
    return 'Use apenas letras, números, _ ou -.';
  }
  return null;
}

export function GiftCodeSection() {
  const { user, applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [giftCode, setGiftCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [rewardReveal, setRewardReveal] = useState<RedeemCodeResponse | null>(null);

  const cosmeticos = useMemo(
    () => resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp),
    [user?.cosmeticos, user?.gamificacao.nivel_xp],
  );

  const handleRedeem = async () => {
    const normalized = normalizeGiftCodeInput(giftCode);
    const validationError = validateGiftCodeInput(normalized);
    if (validationError) {
      showGameToast(validationError, { variant: 'warn' });
      return;
    }

    setBusy(true);

    try {
      const res = await redeemGiftCode(normalized);
      applyUser(res.user);
      setSfxPack(res.user.cosmeticos?.som_equipado ?? 'som_classico');
      setGiftCode('');
      setRewardReveal(res);
      void refreshApp();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Código inválido ou já usado nesta conta.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCloseReveal = () => {
    const reveal = rewardReveal;
    setRewardReveal(null);
    if (!reveal) return;
    if (reveal.xp_ganho > 0) emitXpEarned(reveal.xp_ganho);
    if (reveal.level_up) {
      window.dispatchEvent(new CustomEvent('abdoria:level-up', { detail: reveal.level_up }));
    }
    if (reveal.streak_celebration) {
      queueStreakUpCelebration(reveal.streak_celebration, user?.id);
    }
  };

  return (
    <>
      <div className="settings-gift">
        <label className="sr-only" htmlFor="settings-gift-code">
          Código presente
        </label>
        <input
          id="settings-gift-code"
          className="settings-gift__input"
          value={giftCode}
          onChange={(e) => setGiftCode(e.target.value)}
          placeholder="Digite o código"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={GIFT_CODE_MAX_LENGTH}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && giftCode.trim()) void handleRedeem();
          }}
        />
        <GameButton
          className="settings-gift__action"
          disabled={!giftCode.trim() || busy}
          onClick={() => void handleRedeem()}
        >
          {busy ? 'Resgatando…' : 'Resgatar'}
        </GameButton>
      </div>

      {rewardReveal && (
        <GiftCodeRewardReveal
          result={rewardReveal}
          effectId={cosmeticos.efeito_equipado}
          onClose={handleCloseReveal}
        />
      )}
    </>
  );
}
