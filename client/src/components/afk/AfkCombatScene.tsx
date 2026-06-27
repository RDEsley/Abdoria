import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AfkCombatSnapshot, AfkEnemyId, ArmaPreferida } from '@/types';
import {
  AFK_BOSS_INTERVAL,
  patrolCritChance,
  patrolCritDamage,
  advanceKillsUntilBoss,
  getEnemyMaxHp,
  resolveNextSpawn,
} from '@/types';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { AfkMascotHero } from '@/components/afk/AfkMascotHero';
import { AfkEnemySprite } from '@/components/afk/AfkEnemySprite';
import { AfkCombatHud, AfkBossProgressPanel, useDamageFloaters } from '@/components/afk/AfkCombatHud';
import { AfkSkyCycle } from '@/components/afk/AfkSkyCycle';

interface Props {
  userId: string;
  weapon: ArmaPreferida;
  combat: AfkCombatSnapshot | null;
  hasLoot?: boolean;
  capped?: boolean;
  onBossChange?: (isBoss: boolean) => void;
}

const FALLBACK_SNAPSHOT: AfkCombatSnapshot = {
  kills_total: 0,
  kills_until_boss: 0,
  kills_to_next_boss: AFK_BOSS_INTERVAL,
  enemy_id: 'bat',
  enemy_hp: 42,
  enemy_max_hp: 42,
  is_boss: false,
  elite: false,
  hero_damage_arco: 14,
  hero_damage_espada: 22,
};

export function AfkCombatScene({ userId, weapon, combat, hasLoot, capped, onBossChange }: Props) {
  const isMobile = useMobileViewport();
  const [attackSeq, setAttackSeq] = useState(0);
  const [attackIsCrit, setAttackIsCrit] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'attack'>('idle');
  const [enemyHit, setEnemyHit] = useState(false);
  const [displayHp, setDisplayHp] = useState(combat?.enemy_hp ?? 42);
  const [dying, setDying] = useState(false);
  const [looting, setLooting] = useState(false);
  const [spawnKillsTotal, setSpawnKillsTotal] = useState(combat?.kills_total ?? 0);
  const [localKillsUntilBoss, setLocalKillsUntilBoss] = useState(combat?.kills_until_boss ?? 0);
  const [localIsBoss, setLocalIsBoss] = useState(combat?.is_boss ?? false);
  const [localIsElite, setLocalIsElite] = useState(combat?.elite ?? false);
  const [localEnemyId, setLocalEnemyId] = useState<AfkEnemyId>(combat?.enemy_id ?? 'bat');
  const killsTotalRef = useRef(combat?.kills_total ?? 0);
  const localEnemyIdRef = useRef(localEnemyId);
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
    localEnemyIdRef.current = localEnemyId;
  }, [localIsBoss, localEnemyId]);

  useEffect(() => {
    onBossChange?.(localIsBoss);
  }, [localIsBoss, onBossChange]);

  useEffect(() => {
    if (!combat) return;

    const serverKills = combat.kills_total;
    const localKills = killsTotalRef.current;

    if (serverKills > localKills) {
      killsTotalRef.current = serverKills;
      setLocalKillsUntilBoss(combat.kills_until_boss);
      setLocalIsBoss(combat.is_boss);
      setLocalIsElite(combat.elite);
      setLocalEnemyId(combat.enemy_id);
      setSpawnKillsTotal(combat.kills_total);
      localIsBossRef.current = combat.is_boss;
      localEnemyIdRef.current = combat.enemy_id;
      setDisplayHp(combat.enemy_hp);
    }
  }, [combat]);

  const respawnLocalEnemy = useCallback(
    (killsUntilBoss: number, killsTotal: number) => {
      const picked = resolveNextSpawn(
        userId,
        killsUntilBoss,
        killsTotal,
        localEnemyIdRef.current,
      );

      setLocalEnemyId(picked.enemy_id);
      setLocalIsBoss(picked.is_boss);
      setLocalIsElite(picked.elite);
      setSpawnKillsTotal(killsTotal);
      localIsBossRef.current = picked.is_boss;
      localEnemyIdRef.current = picked.enemy_id;
      setDisplayHp(getEnemyMaxHp(picked.enemy_id));
    },
    [userId],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => {
    const serverKills = serverSnapshot.kills_total;
    if (serverKills > killsTotalRef.current) {
      setDisplayHp(serverSnapshot.enemy_hp);
      setDying(false);
      setLooting(false);
      setEnemyHit(false);
      setPhase('idle');
      setAttackIsCrit(false);
    }
  }, [serverSnapshot.enemy_id, serverSnapshot.kills_total, serverSnapshot.enemy_hp]);

  useEffect(() => {
    clearTimers();

    const runAttack = () => {
      const critKind = weapon === 'arco' ? 'arco' : 'espada';
      const isCrit = Math.random() < patrolCritChance(critKind) / 100;
      setAttackIsCrit(isCrit);
      setAttackSeq((n) => n + 1);
      setPhase('attack');
      setEnemyHit(false);
      schedule(() => {
        setEnemyHit(true);
        const hitDamage = isCrit ? patrolCritDamage(damage, critKind) : damage;
        pushDamage(hitDamage, isCrit);
        setDisplayHp((hp) => {
          const next = hp - hitDamage;
          if (next <= 0) {
            setDying(true);
            schedule(() => setLooting(true), 120);
            schedule(() => {
              const wasBoss = localIsBossRef.current;
              const nextKillsTotal = killsTotalRef.current + 1;
              setLocalKillsUntilBoss((prev) => {
                const nextKills = advanceKillsUntilBoss(prev, wasBoss);
                respawnLocalEnemy(nextKills, nextKillsTotal);
                return nextKills;
              });
              killsTotalRef.current = nextKillsTotal;
              setDying(false);
              setLooting(false);
              setEnemyHit(false);
            }, 720);
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
      <div
        className={[
          'game-afk-scene__viewport',
          weapon === 'espada' && attacking && attackIsCrit ? 'game-afk-scene__viewport--sword-crit-hit' : '',
          weapon === 'espada' && attacking && !attackIsCrit ? 'game-afk-scene__viewport--sword-hit' : '',
          weapon === 'arco' && attacking && attackIsCrit ? 'game-afk-scene__viewport--arrow-crit-hit' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <AfkSkyCycle showClouds={!isMobile} showSparkles={showSparkles} />

        <AfkBossProgressPanel
          killsUntilBoss={localKillsUntilBoss}
          bossActive={localIsBoss}
          overlay
        />

        {localIsBoss && (
          <div className="game-afk-scene__boss-callout" role="status">
            Luta com Boss! Loot Bônus ao Derrotar!
          </div>
        )}

        <AfkMascotHero weapon={weapon} attacking={attacking} attackSeq={attackSeq} isCrit={attackIsCrit} />

        {weapon === 'arco' && attacking && (
          <>
            <span
              key={`arrow-trail-${attackSeq}`}
              className={`game-afk-scene-arrow-trail${attackIsCrit ? ' game-afk-scene-arrow-trail--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`arrow-sonic-a-${attackSeq}`}
              className={`game-afk-scene-arrow-sonic game-afk-scene-arrow-sonic--a${attackIsCrit ? ' game-afk-scene-arrow-sonic--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`arrow-sonic-b-${attackSeq}`}
              className={`game-afk-scene-arrow-sonic game-afk-scene-arrow-sonic--b${attackIsCrit ? ' game-afk-scene-arrow-sonic--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`arrow-${attackSeq}`}
              className={`game-afk-scene-arrow${attackIsCrit ? ' game-afk-scene-arrow--crit' : ''}`}
              aria-hidden
            />
            {attackIsCrit && (
              <span key={`arrow-crit-nova-${attackSeq}`} className="game-afk-scene-arrow-crit-nova" aria-hidden />
            )}
            <span
              key={`arrow-impact-${attackSeq}`}
              className={`game-afk-arrow-impact${attackIsCrit ? ' game-afk-arrow-impact--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`arrow-impact-ring-${attackSeq}`}
              className={`game-afk-arrow-impact-ring${attackIsCrit ? ' game-afk-arrow-impact-ring--crit' : ''}`}
              aria-hidden
            />
          </>
        )}

        {weapon === 'espada' && attacking && (
          <>
            <span
              key={`slash-streak-${attackSeq}`}
              className={`game-afk-slash-streak${attackIsCrit ? ' game-afk-slash-streak--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`slash-wave-${attackSeq}`}
              className={`game-afk-slash-wave${attackIsCrit ? ' game-afk-slash-wave--crit' : ''}`}
              aria-hidden
            />
            {attackIsCrit && (
              <>
                <span key={`slash-crit-wave-${attackSeq}`} className="game-afk-slash-crit-wave" aria-hidden />
                <span key={`slash-crit-x-${attackSeq}`} className="game-afk-sword-crit-cross" aria-hidden />
              </>
            )}
            <span
              key={`impact-burst-${attackSeq}`}
              className={`game-afk-sword-impact${attackIsCrit ? ' game-afk-sword-impact--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`impact-cut-a-${attackSeq}`}
              className={`game-afk-sword-impact-cut game-afk-sword-impact-cut--a${attackIsCrit ? ' game-afk-sword-impact-cut--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`impact-cut-b-${attackSeq}`}
              className={`game-afk-sword-impact-cut game-afk-sword-impact-cut--b${attackIsCrit ? ' game-afk-sword-impact-cut--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`impact-sp1-${attackSeq}`}
              className={`game-afk-sword-impact-spark game-afk-sword-impact-spark--1${attackIsCrit ? ' game-afk-sword-impact-spark--crit' : ''}`}
              aria-hidden
            />
            <span
              key={`impact-sp2-${attackSeq}`}
              className={`game-afk-sword-impact-spark game-afk-sword-impact-spark--2${attackIsCrit ? ' game-afk-sword-impact-spark--crit' : ''}`}
              aria-hidden
            />
          </>
        )}

        <AfkEnemySprite
          combat={snapshot}
          userId={userId}
          spawnKillsTotal={spawnKillsTotal}
          hit={enemyHit}
          critHit={enemyHit && attackIsCrit}
          dying={dying}
          looting={looting}
          hitKey={attackSeq}
        />

        <div className="game-afk-scene__damage-layer" aria-hidden>
          {floaters.map((f) => (
            <span
              key={f.id}
              className={[
                'game-afk-scene__damage',
                snapshot.is_boss && !f.crit ? 'game-afk-scene__damage--boss' : '',
                f.crit ? 'game-afk-scene__damage--crit' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ '--damage-drift': `${f.drift}px` } as CSSProperties}
            >
              {f.crit && <span className="game-afk-scene__damage-tag">CRIT.</span>}
              <span className="game-afk-scene__damage-value">{f.value}</span>
            </span>
          ))}
        </div>
      </div>

      <AfkCombatHud combat={snapshot} displayHp={displayHp} />
    </div>
  );
}
