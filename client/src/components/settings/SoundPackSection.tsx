import { useEffect, useState } from 'react';
import { Check, Coins, Lock, Volume2 } from 'lucide-react';
import {
  PurchaseConfirmDialog,
  type PurchaseConfirmDetails,
} from '@/components/shop/PurchaseConfirmDialog';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { equipShopItem, getShop, purchaseShopItem } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { playEquip, playPurchase, previewSfxPack, setSfxPack } from '@/lib/sounds';
import { CURRENCY_NAME, type ShopCatalogItem } from '@/types';

/** Pacotes de som do jogo — escolhidos aqui nas Opções (não na personalização). */
export function SoundPackSection() {
  const { applyUser } = useAuth();
  const [sons, setSons] = useState<ShopCatalogItem[] | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purchaseConfirm, setPurchaseConfirm] = useState<{
    item: ShopCatalogItem;
    details: PurchaseConfirmDetails;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShop()
      .then((data) => {
        if (cancelled) return;
        setSons(data.sons);
        setSaldo(data.abdoria);
      })
      .catch(() => {
        if (!cancelled) setSons([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = async () => {
    try {
      const data = await getShop();
      setSons(data.sons);
      setSaldo(data.abdoria);
    } catch {
      /* mantém lista atual */
    }
  };

  const handleEquip = async (item: ShopCatalogItem) => {
    setBusyId(item.id);
    try {
      const res = await equipShopItem('som', item.id);
      applyUser(res.user);
      setSfxPack(item.id);
      playEquip();
      await reload();
      showGameToast(`Sons ${item.nome} ativados!`, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível ativar este pacote.'), {
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePurchase = async (item: ShopCatalogItem) => {
    setBusyId(item.id);
    try {
      const res = await purchaseShopItem(item.id);
      applyUser(res.user);
      playPurchase();
      setPurchaseConfirm(null);
      await reload();
      showGameToast(`${item.nome} desbloqueado!`, { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível desbloquear.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const requestPurchase = (item: ShopCatalogItem) => {
    if (item.unlock.tipo !== 'moedas') return;
    setPurchaseConfirm({
      item,
      details: {
        itemName: item.nome,
        itemDescription: item.descricao,
        priceLabel: `${item.unlock.preco_moedas} ${CURRENCY_NAME}`,
        balanceHint: saldo != null ? `Saldo atual: ${saldo} ${CURRENCY_NAME}` : undefined,
      },
    });
  };

  if (sons === null) {
    return <p className="mt-4 text-xs font-bold text-stone-400">Carregando pacotes de som...</p>;
  }

  return (
    <div className="mt-5">
      <p className="text-sm font-bold">Pacote de sons</p>
      <p className="mt-1 mb-2 text-xs font-medium text-stone-500">
        Toque em ouvir para testar antes de ativar.
      </p>
      <ul className="settings-sound-list flex flex-col gap-1.5">
        {sons.map((item) => (
          <li key={item.id} className="settings-sound">
            <button
              type="button"
              className="settings-sound__preview"
              aria-label={`Ouvir sons ${item.nome}`}
              onClick={() => previewSfxPack(item.id)}
            >
              <Volume2 size={14} aria-hidden />
            </button>
            <span className="settings-sound__name">{item.nome}</span>
            {item.equipada ? (
              <span className="settings-sound__equipped">
                <Check size={12} aria-hidden /> Em uso
              </span>
            ) : item.desbloqueada ? (
              <button
                type="button"
                className="settings-sound__action"
                disabled={busyId === item.id}
                onClick={() => void handleEquip(item)}
              >
                Usar
              </button>
            ) : item.pode_comprar ? (
              <button
                type="button"
                className="settings-sound__action settings-sound__action--buy"
                disabled={busyId === item.id}
                onClick={() => requestPurchase(item)}
              >
                <Coins size={12} aria-hidden /> {item.unlock.preco_moedas}
              </button>
            ) : (
              <span className="settings-sound__locked" title={item.unlock_label}>
                <Lock size={12} aria-hidden />
                {item.unlock.tipo === 'moedas' ? `${item.unlock.preco_moedas} ${CURRENCY_NAME}` : ''}
              </span>
            )}
          </li>
        ))}
      </ul>

      <PurchaseConfirmDialog
        open={!!purchaseConfirm}
        details={purchaseConfirm?.details ?? null}
        busy={!!purchaseConfirm && busyId === purchaseConfirm.item.id}
        onConfirm={() => purchaseConfirm && void handlePurchase(purchaseConfirm.item)}
        onCancel={() => {
          if (!busyId) setPurchaseConfirm(null);
        }}
      />
    </div>
  );
}
