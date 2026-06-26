import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AfkCombatSnapshot, AfkEnemyId, ArmaPreferida } from '@/types';
import {
  AFK_BOSS_INTERVAL,
  advanceKillsUntilBoss,
  getEnemyMaxHp,
  pickNextEnemy,
  shouldSpawnBoss,
} from '@/types';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { AfkMascotHero } from '@/components/afk/AfkMascotHero';
import { AfkEnemySprite } from '@/components/afk/AfkEnemySprite';
import { AfkCombatHud, useDamageFloaters } from '@/components/afk/AfkCombatHud';

interface Props {
  weapon: ArmaPreferida;
  combat: AfkCombatSnapshot | null;
  hasLoot?: boolean;
  capped?: boolean;
}

const FALLBACK_SNAPSHOT: AfkCombatSnapshot = {
  kills_total: 0,
  kills_until_boss: 0,
  kills_to_next_boss: AFK_BOSS_INTERVAL,
  enemy_id: 'bat',
  enemy_hp: 24,
  enemy_max_hp: 24,
  is_boss: false,
  elite: false,
  hero_damage_arco: 14,
  hero_damage_espada: 22,
};

export function AfkCombatScene({ weapon, combat, hasLoot, capped }: Props) {
  const isMobile = useMobileViewport();
  const [attackSeq, setAttackSeq] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'attack'>('idle');
  const [enemyHit, setEnemyHit] = useState(false);
  const [displayHp, setDisplayHp] = useState(combat?.enemy_hp ?? 24);
  const [dying, setDying] = useState(false);
  const [localKillsUntilBoss, setLocalKillsUntilBoss] = useState(combat?.kills_until_boss ?? 0);
  const [localIsBoss, setLocalIsBoss] = useState(combat?.is_boss ?? false);
  const [localIsElite, setLocalIsElite] = useState(combat?.elite ?? false);
  const [localEnemyId, setLocalEnemyId] = useState<AfkEnemyId>(combat?.enemy_id ?? 'bat');
  const killsTotalRef = useRef(combat?.kills_total ?? 0);
  const localIsBossRef = useRef(localIsBoss);
  const timersRef = useRef<number[]>([]);
  const { floaters, pushDamage } = useDamageFloaters();

  const serverSnapshot = combat ?? FALLBACK_SNAPSHOT;

  const snapshot = useMemo<AfkCombatSnapshot>(() => {
    const enemyMaxHp = getEnemyMaxHp(localEnemyId);
    return {
      ...serverSnapshot,
      enemy_id: localEnemyId,
      enemy_max_hp: enemyMaxHp,
      is_boss: localIsBoss,
      elite: localIsElite,
      kills_until_boss: localKillsUntilBoss,
      kills_to_next_boss: Math.max(0, AFK_BOSS_INTERVAL - localKillsUntilBoss),
    };
  }, [localEnemyId, localIsBoss, localIsElite, localKillsUntilBoss, serverSnapshot]);

  const damage = weapon === 'arco' ? snapshot.hero_damage_arco : snapshot.hero_damage_espada;
  const attackInterval = weapon === 'arco' ? 1500 : 1900;
  const impactDelay = weapon === 'arco' ? 380 : 200;
  const attacking = phase === 'attack';
  const showSparkles = (hasLoot || capped) && !isMobile;

  useEffect(() => {
    localIsBossRef.current = localIsBoss;
  }, [localIsBoss]);

  useEffect(() => {
    if (!combat) return;

    if (combat.kills_total !== killsTotalRef.current) {
      killsTotalRef.current = combat.kills_total;
      setLocalKillsUntilBoss(combat.kills_until_boss);
      setLocalIsBoss(combat.is_boss);
      setLocalIsElite(combat.elite);
      setLocalEnemyId(combat.enemy_id);
      localIsBossRef.current = combat.is_boss;
      return;
    }

    setLocalKillsUntilBoss((prev) => Math.max(prev, combat.kills_until_boss));
  }, [combat]);

  const respawnLocalEnemy = useCallback((killsUntilBoss: number, killsTotal: number) => {
    const isBoss = shouldSpawnBoss(killsUntilBoss);
    const seed = killsTotal + killsUntilBoss * 17;
    const elite = !isBoss && seed % 100 < 12;
    const picked = pickNextEnemy(seed, { isBoss, isElite: elite });

    setLocalEnemyId(picked.enemy_id);
    setLocalIsBoss(picked.is_boss);
    setLocalIsElite(picked.elite);
    localIsBossRef.current = picked.is_boss;
    setDisplayHp(getEnemyMaxHp(picked.enemy_id));
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => {
    setDisplayHp(serverSnapshot.enemy_hp);
    setDying(false);
    setEnemyHit(false);
    setPhase('idle');
  }, [serverSnapshot.enemy_id, serverSnapshot.kills_total]);

  useEffect(() => {
    clearTimers();

    const runAttack = () => {
      setAttackSeq((n) => n + 1);
      setPhase('attack');
      setEnemyHit(false);
      schedule(() => {
        setEnemyHit(true);
        pushDamage(damage);
        setDisplayHp((hp) => {
          const next = hp - damage;
          if (next <= 0) {
            setDying(true);
            schedule(() => {
              const wasBoss = localIsBossRef.current;
              setLocalKillsUntilBoss((prev) => {
                const nextKills = advanceKillsUntilBoss(prev, wasBoss);
                respawnLocalEnemy(nextKills, killsTotalRef.current + 1);
                return nextKills;
              });
              killsTotalRef.current += 1;
              setDying(false);
              setEnemyHit(false);
            }, 480);
            return 0;
          }
          return next;
        });
      }, impactDelay);

      schedule(() => {
        setEnemyHit(false);
        setPhase('idle');
      }, impactDelay + 420);
    };

    runAttack();
    const combatTimer = window.setInterval(runAttack, attackInterval);

    return () => {
      window.clearInterval(combatTimer);
      clearTimers();
    };
  }, [
    attackInterval,
    clearTimers,
    damage,
    impactDelay,
    pushDamage,
    respawnLocalEnemy,
    schedule,
    snapshot.enemy_max_hp,
    weapon,
  ]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <div className="game-afk-scene">
      <div className="game-afk-scene__viewport">
        <div className="game-afk-scene__sky" aria-hidden />
        {!isMobile && (
          <>
            <div className="game-afk-scene__cloud game-afk-scene__cloud--1" aria-hidden />
            <div className="game-afk-scene__cloud game-afk-scene__cloud--2" aria-hidden />
          </>
        )}
        <div className="game-afk-scene__mountains" aria-hidden />
        <div className="game-afk-scene__ground" aria-hidden />

        {showSparkles && (
          <>
            <span className="game-afk-scene__sparkle game-afk-scene__sparkle--1" aria-hidden />
            <span className="game-afk-scene__sparkle game-afk-scene__sparkle--2" aria-hidden />
            <span className="game-afk-scene__sparkle game-afk-scene__sparkle--3" aria-hidden />
          </>
        )}

        <AfkMascotHero weapon={weapon} attacking={attacking} attackSeq={attackSeq} />

        {weapon === 'espada' && attacking && (
          <span key={attackSeq} className="game-afk-slash game-afk-slash--scene" aria-hidden />
        )}

        <AfkEnemySprite combat={snapshot} hit={enemyHit} dying={dying} hitKey={attackSeq} />

        <div className="game-afk-scene__damage-layer" aria-hidden>
          {floaters.map((f) => (
            <span
              key={f.id}
              className={`game-afk-scene__damage ${snapshot.is_boss ? 'game-afk-scene__damage--boss' : ''}`}
              style={{ '--damage-drift': `${f.drift}px` } as CSSProperties}
            >
              {f.value}
            </span>
          ))}
        </div>
      </div>

      <AfkCombatHud
        combat={snapshot}
        displayHp={displayHp}
        killsUntilBoss={localKillsUntilBoss}
        bossActive={localIsBoss}
      />
    </div>
  );
}
