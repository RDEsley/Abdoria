import { useState } from 'react';
import { Ticket } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { redeemGiftCode } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { CURRENCY_NAME } from '@/types';
import { setSfxPack } from '@/lib/sounds';

export function GiftCodeSection() {
  const { applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [giftCode, setGiftCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRedeem = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await redeemGiftCode(giftCode);
      applyUser(res.user);
      setSfxPack(res.user.cosmeticos?.som_equipado ?? 'som_classico');
      await refreshApp();
      setGiftCode('');
      setSuccess(res.mensagem ?? 'Código resgatado!');
    } catch (err) {
      setError(getErrorMessage(err, 'Código inválido ou já usado.'));
    } finally {
      setBusy(false);
    }
  };

  return (
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
          onChange={(e) => setGiftCode(e.target.value)}
          placeholder="Ex.: abdoria"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && giftCode.trim()) void handleRedeem();
          }}
        />
        <div className="game-gift-code__actions">
          <GameButton disabled={!giftCode.trim() || busy} onClick={() => void handleRedeem()}>
            Resgatar código
          </GameButton>
        </div>
        <p className="game-gift-code__hint">
          Dica: use <strong>abdoria</strong> para XP, {CURRENCY_NAME} e título exclusivo.
        </p>
      </div>

      {error && <p className="game-login__error mt-3">{error}</p>}
      {success && <p className="game-modal__success mt-3">{success}</p>}
    </section>
  );
}
