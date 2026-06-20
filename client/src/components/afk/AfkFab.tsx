import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { AfkPatrolModal } from '@/components/afk/AfkPatrolModal';
import { useApp } from '@/hooks/useApp';
import type { AfkPendingReward } from '@/types';

const AFK_AUTO_OPEN_KEY = 'abdoria_afk_auto_opened';

function hasAfkRewards(pending: AfkPendingReward): boolean {
  return (
    pending.xp > 0
    || pending.abdoria > 0
    || pending.energy_drinks > 0
    || pending.cosmetic_ids.length > 0
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
        className="game-afk-fab"
        onClick={() => setOpen(true)}
        aria-label={hasRewards ? 'Patrulha AFK — recompensas disponíveis' : 'Abrir patrulha AFK'}
      >
        <Shield size={22} strokeWidth={2.5} />
        {hasRewards && <span className="game-afk-fab__badge" aria-hidden />}
      </button>

      <AfkPatrolModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
