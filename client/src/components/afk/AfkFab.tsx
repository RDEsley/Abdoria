import { useEffect, useRef, useState } from 'react';
import { AfkPatrolModal } from '@/components/afk/AfkPatrolModal';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import { useApp } from '@/hooks/useApp';
import { hasAfkRewardsToClaim } from '@shared/utils/afk';

const AFK_AUTO_OPEN_KEY = 'abdoria_afk_auto_opened';

const SCROLL_HIDE_THRESHOLD = 48;

export function AfkFab() {
  const { stats } = useApp();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('abdoria:open-afk', onOpen);
    return () => window.removeEventListener('abdoria:open-afk', onOpen);
  }, []);

  // Estilo Strava: some ao rolar pra baixo e só reaparece de volta ao topo.
  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > SCROLL_HIDE_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hasRewards =
    stats?.afk?.has_rewards ?? (stats?.afk ? hasAfkRewardsToClaim(stats.afk) : false);

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
        className={`game-afk-fab${hasRewards ? ' game-afk-fab--loot' : ''}${hidden ? ' game-afk-fab--hidden' : ''}`}
        tabIndex={hidden ? -1 : undefined}
        aria-hidden={hidden || undefined}
        onClick={() => setOpen(true)}
        aria-label={
          hasRewards
            ? 'Exploração de Abdoria — recompensas disponíveis'
            : 'Abrir exploração de Abdoria'
        }
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
