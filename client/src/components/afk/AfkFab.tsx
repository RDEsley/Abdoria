import { useEffect, useRef, useState } from 'react';
import { AfkPatrolModal } from '@/components/afk/AfkPatrolModal';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import { useApp } from '@/hooks/useApp';
import { hasAfkRewardsToClaim } from '@shared/utils/afk';

const AFK_AUTO_OPEN_KEY = 'abdoria_afk_auto_opened';

export function AfkFab() {
  const { stats } = useApp();
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('abdoria:open-afk', onOpen);
    return () => window.removeEventListener('abdoria:open-afk', onOpen);
  }, []);

  const hasRewards = stats?.afk?.has_rewards
    ?? (stats?.afk ? hasAfkRewardsToClaim(stats.afk) : false);

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
        aria-label={hasRewards ? 'Exploração de Abdoria — recompensas disponíveis' : 'Abrir exploração de Abdoria'}
      >
        <span className="game-afk-fab__glow" aria-hidden />
        <span className="game-afk-fab__shine" aria-hidden />
        <span className="game-afk-fab__icon" aria-hidden>
          <AfkFabSwords />
        </span>
        {hasRewards && (
          <span className="game-afk-fab__badge" aria-hidden>
            <span className="game-afk-fab__badge-core" />
          </span>
        )}
      </button>

      <AfkPatrolModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
