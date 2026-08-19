import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { CelebrationBurst } from '@/components/effects/CelebrationBurst';
import { CosmeticIcon } from '@/components/cosmetics/CosmeticIcon';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/context/AuthContext';
import { ackCosmeticCelebration, getShop } from '@/lib/api';
import { playEquip } from '@/lib/sounds';
import { COSMETIC_RARITY_LABELS, type ShopCatalogItem, type ShopResponse } from '@/types';

const KIND_LABELS: Record<string, string> = {
  moldura_loja: 'Moldura',
  titulo: 'Título',
  som: 'Pacote de som',
  efeito: 'Efeito',
  banner: 'Banner',
};

/** Mensagens especiais das molduras de streak longa — agradecimento na tela. */
const SPECIAL_MESSAGES: Record<string, string> = {
  borda_lendario:
    '360 dias de chama acesa. Um ano inteiro de dedicação — obrigado por fazer parte de Evolyn. Essa moldura é sua para sempre.',
  borda_imparavel:
    '160 dias sem apagar a chama. Pouquíssimos chegam até aqui — Evolyn agradece a sua constância.',
};

function findCatalogItem(catalog: ShopResponse, id: string): ShopCatalogItem | undefined {
  return [
    ...catalog.molduras_loja,
    ...catalog.titulos,
    ...(catalog.banners ?? []),
    ...catalog.sons,
    ...catalog.efeitos,
  ].find((item) => item.id === id);
}

/**
 * Reveal global de cosmético desbloqueado (fila `desbloqueios_pendentes` do
 * servidor): um item por vez, estilo abrir carta de baú. Sem isso o jogador
 * nunca fica sabendo que ganhou um cosmético novo.
 */
export function CosmeticUnlockCelebration() {
  const { user, applyUser } = useAuth();
  const pendingIds = useMemo(
    () => user?.cosmeticos?.desbloqueios_pendentes ?? [],
    [user?.cosmeticos?.desbloqueios_pendentes],
  );

  const [items, setItems] = useState<ShopCatalogItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (pendingIds.length === 0) {
      setItems(null);
      setIndex(0);
      return;
    }
    let cancelled = false;
    getShop()
      .then((catalog) => {
        if (cancelled) return;
        const resolved = pendingIds
          .map((id) => findCatalogItem(catalog, id))
          .filter((item): item is ShopCatalogItem => Boolean(item));
        if (resolved.length === 0) {
          // Ids sem item no catálogo (removidos): só limpa a fila em silêncio.
          void ackCosmeticCelebration().then((res) => applyUser(res.user));
          return;
        }
        setIndex(0);
        setItems(resolved);
        playEquip();
      })
      .catch(() => {
        /* sem catálogo, tenta de novo no próximo refresh */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds.join('|')]);

  if (!items || items.length === 0) return null;

  const item = items[Math.min(index, items.length - 1)];
  const isLast = index >= items.length - 1;
  const specialMessage = SPECIAL_MESSAGES[item.id];

  const handleAdvance = async () => {
    if (closing) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      playEquip();
      return;
    }
    setClosing(true);
    try {
      const res = await ackCosmeticCelebration();
      applyUser(res.user);
    } catch {
      /* fila continua no servidor; tenta de novo na próxima sessão */
    } finally {
      setItems(null);
      setIndex(0);
      setClosing(false);
    }
  };

  return createPortal(
    <div
      className="game-daily-reward-overlay game-gift-reward-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cosmetic-unlock-title"
    >
      <CelebrationBurst
        effectId={user?.cosmeticos?.efeito_equipado ?? 'efeito_padrao'}
        fullscreen
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          className="game-gift-reward-card cosmetic-unlock-card"
          initial={{ scale: 0.6, opacity: 0, rotateY: 90 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          <div className="game-gift-reward-card__banner">
            <Sparkles size={14} aria-hidden />
            <span>Novo cosmético</span>
          </div>

          <p className="game-gift-reward-card__eyebrow">
            {KIND_LABELS[item.kind] ?? 'Item'} · {COSMETIC_RARITY_LABELS[item.raridade]}
          </p>

          <div
            className={`cosmetic-unlock-card__stage cosmetic-unlock-card__stage--${item.raridade}`}
          >
            {item.kind === 'moldura_loja' ? (
              <span
                className={`cosmetic-unlock-card__ring game-cosmetic-avatar--border-${item.id.replace('borda_', '')}`}
                aria-hidden
              />
            ) : (
              <CosmeticIcon icon={item.icon} size={44} unlocked raridade={item.raridade} />
            )}
          </div>

          <h2 id="cosmetic-unlock-title" className="game-gift-reward-card__title">
            {item.nome}
          </h2>
          <p className="game-gift-reward-card__message">{specialMessage ?? item.descricao}</p>

          <GameButton
            className="game-gift-reward-card__cta"
            disabled={closing}
            onClick={() => void handleAdvance()}
          >
            {isLast ? 'Incrível!' : `Próximo (${index + 1}/${items.length})`}
          </GameButton>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
