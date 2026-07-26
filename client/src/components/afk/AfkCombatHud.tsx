import { useCallback, useEffect, useState } from 'react';
import { AFK_BOSS_INTERVAL } from '@/types';

export function AfkBossProgressPanel({
  killsUntilBoss,
  bossActive,
  overlay = false,
}: {
  killsUntilBoss: number;
  bossActive: boolean;
  overlay?: boolean;
}) {
  const bossProgressPct = Math.max(
    0,
    Math.min(100, (killsUntilBoss / (AFK_BOSS_INTERVAL - 1)) * 100),
  );

  return (
    <div
      className={`game-afk-combat-hud__boss-panel${overlay ? ' game-afk-combat-hud__boss-panel--overlay' : ''}${bossActive ? ' game-afk-combat-hud__boss-panel--active' : ''}`}
    >
      <div className="game-afk-combat-hud__boss-header">
        <span className="game-afk-combat-hud__boss-label">
          {bossActive ? 'Boss em combate' : 'Próximo boss'}
        </span>
        <span className="game-afk-combat-hud__boss-count tabular-nums">
          {bossActive ? '👑' : `${killsUntilBoss}/${AFK_BOSS_INTERVAL - 1}`}
        </span>
      </div>
      <div
        className="game-afk-combat-hud__boss-track"
        role="progressbar"
        aria-valuenow={killsUntilBoss}
        aria-valuemin={0}
        aria-valuemax={AFK_BOSS_INTERVAL - 1}
        aria-label={
          bossActive
            ? 'Boss em combate'
            : `Progresso até o boss: ${killsUntilBoss} de ${AFK_BOSS_INTERVAL - 1}`
        }
      >
        <div
          className="game-afk-combat-hud__boss-fill"
          style={{ width: `${bossActive ? 100 : bossProgressPct}%` }}
        />
      </div>
    </div>
  );
}

export function useDamageFloaters() {
  const [floaters, setFloaters] = useState<
    { id: number; value: number; drift: number; crit: boolean }[]
  >([]);

  const pushDamage = useCallback((value: number, crit = false) => {
    const id = Date.now() + Math.random();
    const drift = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 16);
    setFloaters((prev) => [...prev.slice(-3), { id, value, drift, crit }]);
    window.setTimeout(
      () => {
        setFloaters((prev) => prev.filter((f) => f.id !== id));
      },
      crit ? 1050 : 950,
    );
  }, []);

  useEffect(() => () => setFloaters([]), []);

  return { floaters, pushDamage };
}
