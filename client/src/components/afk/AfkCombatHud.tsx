import { useCallback, useEffect, useState } from 'react';
import type { AfkCombatSnapshot } from '@/types';
import { AFK_BOSS_INTERVAL, AFK_ENEMIES } from '@/types';

interface Props {
  combat: AfkCombatSnapshot;
  displayHp: number;
  killsUntilBoss: number;
  bossActive: boolean;
}

export function AfkCombatHud({ combat, displayHp, killsUntilBoss, bossActive }: Props) {
  const maxHp = combat.enemy_max_hp;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (displayHp / maxHp) * 100)) : 0;
  const enemyLabel = AFK_ENEMIES[combat.enemy_id]?.label ?? 'Slime';
  const tierClass = combat.is_boss ? 'boss' : combat.elite ? 'elite' : 'common';
  const bossProgressPct = Math.max(
    0,
    Math.min(100, (killsUntilBoss / (AFK_BOSS_INTERVAL - 1)) * 100),
  );
  const killsRemaining = bossActive
    ? 0
    : Math.max(0, AFK_BOSS_INTERVAL - 1 - killsUntilBoss);

  return (
    <div className="game-afk-combat-hud">
      <div className={`game-afk-combat-hud__enemy-bar game-afk-combat-hud__enemy-bar--${tierClass}`}>
        <div className="game-afk-combat-hud__enemy-header">
          <div className="game-afk-combat-hud__enemy-identity">
            <span className="game-afk-combat-hud__enemy-slug" aria-hidden>
              {combat.is_boss ? '👑' : combat.elite ? '✦' : '●'}
            </span>
            <div className="game-afk-combat-hud__enemy-title">
              <span className="game-afk-combat-hud__enemy-name">{enemyLabel}</span>
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

      <div className="game-afk-combat-hud__boss-panel">
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
        {!bossActive && (
          <p className="game-afk-combat-hud__boss-hint tabular-nums">
            Faltam {killsRemaining} {killsRemaining === 1 ? 'inimigo' : 'inimigos'}
          </p>
        )}
      </div>
    </div>
  );
}

export function useDamageFloaters() {
  const [floaters, setFloaters] = useState<{ id: number; value: number; drift: number }[]>([]);

  const pushDamage = useCallback((value: number) => {
    const id = Date.now() + Math.random();
    const drift = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 16);
    setFloaters((prev) => [...prev.slice(-3), { id, value, drift }]);
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 950);
  }, []);

  useEffect(() => () => setFloaters([]), []);

  return { floaters, pushDamage };
}
