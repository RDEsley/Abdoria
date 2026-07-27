import { useCallback, useEffect, useState } from 'react';
import { AFK_BOSS_INTERVAL } from '@/types';

export function AfkBossProgressPanel({
  killsUntilBoss,
  bossActive,
  overlay = false,
  bossHp,
  bossMaxHp,
  bossHit = false,
}: {
  killsUntilBoss: number;
  bossActive: boolean;
  overlay?: boolean;
  /** Vida atual do boss — só faz sentido (e só é usado) quando `bossActive`.
      Essa barra vira a barra de vida real do boss durante a luta; ele não
      tem a barrinha flutuante em cima da cabeça que os outros slimes têm. */
  bossHp?: number;
  bossMaxHp?: number;
  bossHit?: boolean;
}) {
  const bossProgressPct = Math.max(0, Math.min(100, (killsUntilBoss / AFK_BOSS_INTERVAL) * 100));
  const bossHpPct =
    bossActive && bossMaxHp && bossMaxHp > 0
      ? Math.max(0, Math.min(100, ((bossHp ?? bossMaxHp) / bossMaxHp) * 100))
      : 100;
  const bossHpStage = bossHpPct > 50 ? 'high' : bossHpPct > 25 ? 'mid' : 'low';

  return (
    <div
      className={`game-afk-combat-hud__boss-panel${overlay ? ' game-afk-combat-hud__boss-panel--overlay' : ''}${bossActive ? ' game-afk-combat-hud__boss-panel--active' : ''}`}
    >
      <div className="game-afk-combat-hud__boss-header">
        <span className="game-afk-combat-hud__boss-label">
          {bossActive ? 'Boss em combate' : 'Próximo boss'}
        </span>
        <span className="game-afk-combat-hud__boss-count tabular-nums">
          {bossActive
            ? `${Math.max(0, Math.round(bossHp ?? 0)).toLocaleString('pt-BR')} HP`
            : `${killsUntilBoss}/${AFK_BOSS_INTERVAL}`}
        </span>
      </div>
      <div
        className={`game-afk-combat-hud__boss-track${bossActive ? ` game-afk-combat-hud__boss-track--${bossHpStage}` : ''}${bossActive && bossHit ? ' game-afk-combat-hud__boss-track--hit' : ''}`}
        role="progressbar"
        aria-valuenow={bossActive ? (bossHp ?? 0) : killsUntilBoss}
        aria-valuemin={0}
        aria-valuemax={bossActive ? (bossMaxHp ?? 0) : AFK_BOSS_INTERVAL}
        aria-label={
          bossActive
            ? `Vida do boss: ${bossHp ?? 0} de ${bossMaxHp ?? 0}`
            : `Progresso até o boss: ${killsUntilBoss} de ${AFK_BOSS_INTERVAL}`
        }
      >
        <div
          className="game-afk-combat-hud__boss-fill"
          style={{ width: `${bossActive ? bossHpPct : bossProgressPct}%` }}
        />
        {bossActive && <span className="game-afk-combat-hud__boss-flash" aria-hidden />}
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
