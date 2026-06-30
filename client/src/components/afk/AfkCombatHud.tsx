import { useCallback, useEffect, useState } from 'react';
import type { AfkCombatSnapshot } from '@/types';
import { AFK_BOSS_INTERVAL, AFK_ENEMIES } from '@/types';

interface EnemyBarProps {
  combat: AfkCombatSnapshot;
  displayHp: number;
}

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
        aria-label={bossActive ? 'Boss em combate' : `Progresso até o boss: ${killsUntilBoss} de ${AFK_BOSS_INTERVAL - 1}`}
      >
        <div
          className="game-afk-combat-hud__boss-fill"
          style={{ width: `${bossActive ? 100 : bossProgressPct}%` }}
        />
      </div>
    </div>
  );
}

export function AfkCombatHud({ combat, displayHp }: EnemyBarProps) {
  const maxHp = combat.enemy_max_hp;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (displayHp / maxHp) * 100)) : 0;
  const enemyLabel = AFK_ENEMIES[combat.enemy_id]?.label ?? 'Slime';
  const tierClass =
    combat.enemy_id === 'golden_slime' || combat.enemy_id === 'magic_rabbit'
      ? 'golden'
      : combat.is_boss
        ? 'boss'
        : combat.elite
          ? 'elite'
          : 'common';

  return (
    <div className="game-afk-combat-hud">
      <div className={`game-afk-combat-hud__enemy-bar game-afk-combat-hud__enemy-bar--${tierClass}`}>
        <div className="game-afk-combat-hud__enemy-header">
          <div className="game-afk-combat-hud__enemy-identity">
            <span className="game-afk-combat-hud__enemy-slug" aria-hidden>
              {combat.enemy_id === 'golden_slime' || combat.enemy_id === 'magic_rabbit' ? '✧' : combat.is_boss ? '👑' : combat.elite ? '✦' : '●'}
            </span>
            <div className="game-afk-combat-hud__enemy-title">
              <span className="game-afk-combat-hud__enemy-name">{enemyLabel}</span>
              {combat.enemy_id === 'golden_slime' && (
                <span className="game-afk-combat-hud__badge game-afk-combat-hud__badge--golden">Raro</span>
              )}
              {combat.enemy_id === 'magic_rabbit' && (
                <span className="game-afk-combat-hud__badge game-afk-combat-hud__badge--golden">Mágico</span>
              )}
              {combat.is_boss && (
                <span className="game-afk-combat-hud__badge game-afk-combat-hud__badge--boss">BOSS</span>
              )}
              {!combat.is_boss && combat.elite && (
                <span className="game-afk-combat-hud__badge game-afk-combat-hud__badge--elite">Elite</span>
              )}
            </div>
          </div>
          <span className="game-afk-combat-hud__hp-text tabular-nums">
            {Math.max(0, Math.ceil(displayHp))} / {maxHp}
          </span>
        </div>
        <div
          className="game-afk-combat-hud__hp-track"
          role="progressbar"
          aria-valuenow={displayHp}
          aria-valuemin={0}
          aria-valuemax={maxHp}
          aria-label={`Vida de ${enemyLabel}`}
        >
          <div className="game-afk-combat-hud__hp-fill" style={{ width: `${hpPct}%` }} />
        </div>
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
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, crit ? 1050 : 950);
  }, []);

  useEffect(() => () => setFloaters([]), []);

  return { floaters, pushDamage };
}
