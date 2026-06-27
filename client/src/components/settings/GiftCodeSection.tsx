import { useMemo, useState } from 'react';
import { Ticket } from 'lucide-react';
import { GiftCodeRewardReveal } from '@/components/settings/GiftCodeRewardReveal';
import { GameButton } from '@/components/ui/GameButton';
import { redeemGiftCode } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { type RedeemCodeResponse, resolveCosmeticos } from '@/types';
import { setSfxPack } from '@/lib/sounds';

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
      await refreshApp();
      setGiftCode('');
      setRewardReveal(res);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Código inválido ou já usado nesta conta.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="glass-card p-4">
        <h3 className="game-section-title mb-4 flex items-center gap-2">
          <Ticket size={14} /> Código presente
        </h3>

        <div className="game-gift-code">
          <label className="game-gift-code__label" htmlFor="settings-gift-code">
            Resgatar código promocional
          </label>
          <input
            id="settings-gift-code"
            className="game-input mt-2 w-full"
            value={giftCode}
            onChange={(e) => {
              setGiftCode(e.target.value);
            }}
            placeholder="Seu código presente"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={GIFT_CODE_MAX_LENGTH}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && giftCode.trim()) void handleRedeem();
            }}
          />
          <div className="game-gift-code__actions">
            <GameButton disabled={!giftCode.trim() || busy} onClick={() => void handleRedeem()}>
              Resgatar código
            </GameButton>
          </div>
        </div>
      </section>

      {rewardReveal && (
        <GiftCodeRewardReveal
          result={rewardReveal}
          effectId={cosmeticos.efeito_equipado}
          onClose={() => setRewardReveal(null)}
        />
      )}
    </>
  );
}
