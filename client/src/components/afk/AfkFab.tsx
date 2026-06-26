import { useEffect, useRef, useState } from 'react';
import { Swords } from 'lucide-react';
import { AfkPatrolModal } from '@/components/afk/AfkPatrolModal';
import { useApp } from '@/hooks/useApp';
import type { AfkPendingReward } from '@/types';

const AFK_AUTO_OPEN_KEY = 'abdoria_afk_auto_opened';

function hasAfkRewards(pending: AfkPendingReward): boolean {
  const cosmeticIds = pending.cosmetic_ids ?? [];
  return (
    pending.xp > 0
    || pending.abdoria > 0
    || pending.energy_drinks > 0
    || cosmeticIds.length > 0
    || pending.titulo_secreto
  );
}

export function AfkFab() {
  const { stats } = useApp();
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  const hasRewards = stats?.afk?.has_rewards ?? (stats?.afk ? hasAfkRewards(stats.afk.pending) : false);

  useEffect(() => {
    if (!hasRewards || autoOpenedRef.current) return;
    if (sessionStorage.getItem(AFK_AUTO_OPEN_KEY) === '1') return;
    autoOpenedRef.current = true;
    sessionStorage.setItem(AFK_AUTO_OPEN_KEY, '1');
    setOpen(true);
  }, [hasRewards]);

  return (
    <>
      <button
        type="button"
        className={`game-afk-fab${hasRewards ? ' game-afk-fab--loot' : ''}`}
        onClick={() => setOpen(true)}
        aria-label={hasRewards ? 'Patrulha de Abdoria — recompensas disponíveis' : 'Abrir patrulha de Abdoria'}
      >
        <span className="game-afk-fab__icon" aria-hidden>
          <Swords size={18} strokeWidth={2.75} />
        </span>
        <span className="game-afk-fab__label">Patrulha</span>
        {hasRewards && <span className="game-afk-fab__badge" aria-hidden />}
      </button>

      <AfkPatrolModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
