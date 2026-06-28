import { useCallback, useEffect, useState } from 'react';
import { CosmeticsModal } from '@/components/cosmetics/CosmeticsModal';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { InventoryModal } from '@/components/inventory/InventoryModal';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { resolveCosmeticos, xpProgressFromTotal } from '@/types';

const INVENTORY_SEEN_KEY = 'abdoria:inventory_seen_count';

export function GameHud() {
  const { stats, user: appUser } = useApp();
  const { user: authUser } = useAuth();
  const user = appUser ?? authUser;
  const [showCosmetics, setShowCosmetics] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [coinsEarnedPulse, setCoinsEarnedPulse] = useState<number | null>(null);
  const [seenInventoryCount, setSeenInventoryCount] = useState<number>(() =>
    parseInt(localStorage.getItem(INVENTORY_SEEN_KEY) ?? '0', 10),
  );

  const closeCosmetics = useCallback(() => setShowCosmetics(false), []);
  const closeInventory = useCallback(() => setShowInventory(false), []);

  const openInventory = useCallback((total: number) => {
    setSeenInventoryCount(total);
    localStorage.setItem(INVENTORY_SEEN_KEY, String(total));
    setShowInventory(true);
  }, []);

  useEffect(() => {
    const onCoinsEarned = (event: Event) => {
      const amount = (event as CustomEvent<{ amount: number }>).detail?.amount ?? 0;
      if (amount <= 0) return;
      setCoinsEarnedPulse(amount);
      window.setTimeout(() => setCoinsEarnedPulse(null), 2200);
    };
    window.addEventListener('abdoria:coins-earned', onCoinsEarned);
    return () => window.removeEventListener('abdoria:coins-earned', onCoinsEarned);
  }, []);

  const xpTotal = stats?.nivel_xp ?? user?.gamificacao.nivel_xp ?? 0;
  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(xpTotal);
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const equippedTitle = cosmeticos.titulo_equipado ? COSMETIC_BY_ID[cosmeticos.titulo_equipado]?.nome : null;
  const titleClassName =
    cosmeticos.titulo_equipado === 'titulo_dono_do_jogo'
      ? 'cosmetic-title--dono-do-jogo'
      : cosmeticos.titulo_equipado === 'titulo_secreto'
        ? 'cosmetic-title--secreto'
        : undefined;

  const inventoryItemCount =
    (stats?.frozen_streak_count ?? 0)
    + (stats?.route_drink_count ?? 0)
    + (stats?.exp_instant_count ?? 0)
    + (stats?.doria_bag_count ?? 0);

  const newInventoryCount = Math.max(0, inventoryItemCount - seenInventoryCount);

  const fundoKey = cosmeticos.fundo_equipado.replace('fundo_', '');
  const backgroundClass = fundoKey === 'padrao' ? undefined : `game-card-fundo--${fundoKey}`;
  const backgroundLight = fundoKey === 'praia';

  return (
    <>
      <TopNavbar
        userName={firstName}
        userLevel={level}
        userXp={xpInLevel}
        xpMax={xpToNext}
        doriasAmount={cosmeticos.moedas}
        inventoryItemCount={newInventoryCount}
        backgroundClass={backgroundClass}
        backgroundLight={backgroundLight}
        avatar={<CosmeticAvatar user={user} size="sm" className="top-navbar__cosmetic-avatar" />}
        userTitle={equippedTitle}
        titleClassName={titleClassName}
        coinsEarnedPulse={coinsEarnedPulse}
        onProfileClick={() => setShowCosmetics(true)}
        onDoriasAddClick={() => setShowCosmetics(true)}
        onInventoryClick={() => openInventory(inventoryItemCount)}
      />

      <CosmeticsModal open={showCosmetics} onClose={closeCosmetics} />
      <InventoryModal open={showInventory} onClose={closeInventory} layer="modal" />
    </>
  );
}
