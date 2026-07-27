import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { AfkCombatSnapshot, AfkEnemyId, ArmaPreferida, PersonagemGenero } from '@/types';
import {
  AFK_BOSS_INTERVAL,
  advanceKillsUntilBoss,
  getEnemyMaxHp,
  resolveNextSpawn,
  resolvePatrolAttackDamage,
  resolvePatrolBaseDamage,
  resolvePatrolCritChancePercent,
} from '@/types';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { emitAfkLootOrbs } from '@/lib/afk-loot-orbs';
import { AfkLootOrbLayer } from '@/components/afk/AfkLootOrbLayer';
import { AfkMascotHero } from '@/components/afk/AfkMascotHero';
import { AfkEnemySprite } from '@/components/afk/AfkEnemySprite';
import { AfkSpellEffect } from '@/components/afk/AfkSpellEffect';
import { AfkBossProgressPanel, useDamageFloaters } from '@/components/afk/AfkCombatHud';
import { AfkSkyCycle } from '@/components/afk/AfkSkyCycle';

interface Props {
  userId: string;
  weapon: ArmaPreferida;
  weaponId: string;
  genero?: PersonagemGenero;
  combat: AfkCombatSnapshot | null;
  hasLoot?: boolean;
  capped?: boolean;
  onBossChange?: (isBoss: boolean) => void;
  onBackToVillage?: () => void;
}

const FALLBACK_SNAPSHOT: AfkCombatSnapshot = {
  kills_total: 0,
  kills_until_boss: 0,
  kills_to_next_boss: AFK_BOSS_INTERVAL,
  enemy_id: 'bat',
  enemy_hp: 90,
  enemy_max_hp: 90,
  is_boss: false,
  elite: false,
  hero_damage_arco: 14,
  hero_damage_espada: 22,
};

export function AfkCombatScene({
  userId,
  weapon,
  weaponId,
  genero = 'masculino',
  combat,
  hasLoot,
  capped,
  onBossChange,
  onBackToVillage,
}: Props) {
  const isMobile = useMobileViewport();
  const [attackSeq, setAttackSeq] = useState(0);
  const [attackIsCrit, setAttackIsCrit] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'attack'>('idle');
  const [enemyHit, setEnemyHit] = useState(false);
  const [displayHp, setDisplayHp] = useState(combat?.enemy_hp ?? 90);
  // Vida ANTES do golpe mais recente — alimenta o "rastro" da barra de vida
  // (a parte clara que ainda mostra o pedaço perdido por um instante antes de
  // escorregar pro valor novo). É lido no render, então é state, não ref.
  const [previousDisplayHp, setPreviousDisplayHp] = useState(combat?.enemy_hp ?? 90);
  // Fonte de verdade da vida pra LÓGICA de combate. O state `displayHp` serve
  // só pra desenhar: o React invoca updaters de state mais de uma vez
  // (StrictMode em dev, e concorrência em geral), então qualquer efeito
  // colateral dentro de `setDisplayHp(fn)` roda duplicado — era isso que
  // agendava dois respawns por abate e contava +2 no contador de boss.
  const displayHpRef = useRef(combat?.enemy_hp ?? 90);
  /** Trava o abate a um por spawn, mesmo se um golpe chegar atrasado. */
  const killHandledRef = useRef(false);
  const [dying, setDying] = useState(false);
  const [looting, setLooting] = useState(false);
  const [lootDropSeq, setLootDropSeq] = useState(0);
  const hasLootRef = useRef(hasLoot);
  const [spawnKillsTotal, setSpawnKillsTotal] = useState(combat?.kills_total ?? 0);
  const [localKillsUntilBoss, setLocalKillsUntilBoss] = useState(combat?.kills_until_boss ?? 0);
  const [localIsBoss, setLocalIsBoss] = useState(combat?.is_boss ?? false);
  const [localIsElite, setLocalIsElite] = useState(combat?.elite ?? false);
  const [localEnemyId, setLocalEnemyId] = useState<AfkEnemyId>(combat?.enemy_id ?? 'bat');
  const killsTotalRef = useRef(combat?.kills_total ?? 0);
  const critStreakRef = useRef(0);
  const localEnemyIdRef = useRef(localEnemyId);
  const localIsBossRef = useRef(localIsBoss);
  const localIsEliteRef = useRef(localIsElite);
  const localKillsUntilBossRef = useRef(combat?.kills_until_boss ?? 0);
  /** Sobe no INSTANTE do impacto (não no início do ataque) — as animações de
      dano da barra de vida são chaveadas nele, senão em magia (impacto 620ms
      depois do início, cauda de 1,5s) o flash/rastro tocava fora de hora. */
  const [hitSeq, setHitSeq] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
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

  const critKind = weapon;
  const damage = resolvePatrolBaseDamage(critKind, weaponId, localEnemyId);
  // Magia: ciclo mais lento, impacto tardio e cauda longa — as animações de
  // feitiço (nuvem, dragão, cristal...) precisam terminar antes do próximo ciclo.
  const attackInterval = weapon === 'arco' ? 1500 : weapon === 'magia' ? 2400 : 1900;
  const impactDelay = weapon === 'arco' ? 380 : weapon === 'magia' ? 620 : 200;
  const attackTail = weapon === 'magia' ? 1500 : 420;
  const attacking = phase === 'attack';
  const showSparkles = (hasLoot || capped) && !isMobile;

  useEffect(() => {
    localIsBossRef.current = localIsBoss;
    localEnemyIdRef.current = localEnemyId;
    localIsEliteRef.current = localIsElite;
  }, [localIsBoss, localEnemyId, localIsElite]);

  useEffect(() => {
    hasLootRef.current = hasLoot;
  }, [hasLoot]);

  useEffect(() => {
    onBossChange?.(localIsBoss);
  }, [localIsBoss, onBossChange]);

  /** true depois do 1º sync com o servidor nesta sessão da cena. */
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!combat) return;

    const serverKills = combat.kills_total;
    const localKills = killsTotalRef.current;
    if (serverKills <= localKills) return;

    // Só a 1ª sincronização troca o inimigo/vida visíveis na hora — reflete
    // onde a exploração realmente está ao abrir a tela (depois de ausência,
    // claim, etc). Da 2ª em diante, só absorve o contador sem tocar no
    // inimigo/vida: o servidor "tica" num ritmo fixo (8 kills/min) que não
    // tem relação com o tempo real de abater um boss/elite na tela — sem essa
    // trava, o poll de 15s cortava a luta local no meio (o inimigo trocava
    // sem morrer de verdade, parecendo "morrer antes da vida acabar").
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      killsTotalRef.current = serverKills;
      setLocalKillsUntilBoss(combat.kills_until_boss);
      setLocalIsBoss(combat.is_boss);
      setLocalIsElite(combat.elite);
      setLocalEnemyId(combat.enemy_id);
      setSpawnKillsTotal(combat.kills_total);
      localIsBossRef.current = combat.is_boss;
      localEnemyIdRef.current = combat.enemy_id;
      localKillsUntilBossRef.current = combat.kills_until_boss;
      setDisplayHp(combat.enemy_hp);
      setPreviousDisplayHp(combat.enemy_hp);
      displayHpRef.current = combat.enemy_hp;
      killHandledRef.current = false;
      return;
    }

    killsTotalRef.current = serverKills;
  }, [combat]);

  const respawnLocalEnemy = useCallback(
    (killsUntilBoss: number, killsTotal: number) => {
      const picked = resolveNextSpawn(userId, killsUntilBoss, killsTotal, localEnemyIdRef.current);

      setLocalEnemyId(picked.enemy_id);
      setLocalIsBoss(picked.is_boss);
      setLocalIsElite(picked.elite);
      setSpawnKillsTotal(killsTotal);
      localIsBossRef.current = picked.is_boss;
      localEnemyIdRef.current = picked.enemy_id;
      const freshHp = getEnemyMaxHp(picked.enemy_id);
      setDisplayHp(freshHp);
      // Inimigo novo: sem isso, o rastro da barra "puxava" do valor quase
      // zero do bicho anterior até o HP cheio do novo, parecendo a barra
      // enchendo em vez de só aparecer cheia.
      setPreviousDisplayHp(freshHp);
      displayHpRef.current = freshHp;
      killHandledRef.current = false;
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
      setPreviousDisplayHp(serverSnapshot.enemy_hp);
      displayHpRef.current = serverSnapshot.enemy_hp;
      killHandledRef.current = false;
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
      const enemyId = localEnemyIdRef.current;
      const critChance = resolvePatrolCritChancePercent(critKind, weaponId, enemyId);
      const isCrit = critChance > 0 && Math.random() < critChance / 100;
      const attack = resolvePatrolAttackDamage({
        kind: critKind,
        weaponId,
        enemyId,
        critStreak: critStreakRef.current,
        isCrit,
      });
      critStreakRef.current = attack.nextCritStreak;

      setAttackIsCrit(isCrit);
      setAttackSeq((n) => n + 1);
      setPhase('attack');
      setEnemyHit(false);
      schedule(() => {
        // Golpe atrasado chegando depois do abate (a cauda da magia é longa)
        // não pode reabrir a sequência de morte.
        if (killHandledRef.current) return;

        const hitDamage = attack.damage;
        const hpBefore = displayHpRef.current;
        const next = attack.isHitKill ? 0 : hpBefore - hitDamage;

        setPreviousDisplayHp(hpBefore);
        displayHpRef.current = Math.max(0, next);

        setEnemyHit(true);
        setHitSeq((n) => n + 1);
        pushDamage(hitDamage, isCrit);
        setDisplayHp(Math.max(0, next));

        if (next > 0) return;

        killHandledRef.current = true;
        critStreakRef.current = 0;
        setDying(true);
        // Sequência da morte: o slime encolhe (dying) → os acessórios se
        // soltam e caem (looting) → o item pula → vira bolinha e voa pro
        // baú, que dá uma mexida a cada chegada.
        schedule(() => setLooting(true), 120);

        const wasBossKill = localIsBossRef.current;
        const wasEliteKill = localIsEliteRef.current;
        const orbCount = wasBossKill ? 5 : wasEliteKill ? 3 : 2;
        // Boss/elite sempre rendem a cena inteira; comum entra em parte dos
        // abates pra não virar poluição visual a cada 2 segundos.
        const showDrop =
          hasLootRef.current && (wasBossKill || wasEliteKill || Math.random() < 0.45);

        if (showDrop) {
          schedule(() => setLootDropSeq((n) => n + 1), 150);
          schedule(() => {
            const enemyEl = viewportRef.current?.querySelector('.game-afk-enemy');
            emitAfkLootOrbs(orbCount, enemyEl);
          }, 300);
        }

        schedule(() => {
          const nextKillsTotal = killsTotalRef.current + 1;
          const nextKills = advanceKillsUntilBoss(localKillsUntilBossRef.current, wasBossKill);
          localKillsUntilBossRef.current = nextKills;
          killsTotalRef.current = nextKillsTotal;
          setLocalKillsUntilBoss(nextKills);
          respawnLocalEnemy(nextKills, nextKillsTotal);
          setDying(false);
          setLooting(false);
          setEnemyHit(false);
        }, 720);
      }, impactDelay);

      schedule(() => {
        setEnemyHit(false);
        setPhase('idle');
      }, impactDelay + attackTail);
    };

    runAttack();
    const combatTimer = window.setInterval(runAttack, attackInterval);

    return () => {
      window.clearInterval(combatTimer);
      clearTimers();
    };
  }, [
    attackInterval,
    attackTail,
    clearTimers,
    damage,
    impactDelay,
    pushDamage,
    respawnLocalEnemy,
    schedule,
    snapshot.enemy_max_hp,
    weapon,
    weaponId,
    critKind,
  ]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <div className="game-afk-scene">
      <AfkLootOrbLayer />
      <div
        ref={viewportRef}
        className={[
          'game-afk-scene__viewport',
          `game-afk-scene__viewport--enemy-${localEnemyId}`,
          weapon === 'espada' && attacking && attackIsCrit
            ? 'game-afk-scene__viewport--sword-crit-hit'
            : '',
          weapon === 'espada' && attacking && !attackIsCrit
            ? 'game-afk-scene__viewport--sword-hit'
            : '',
          weapon === 'arco' && attacking && attackIsCrit
            ? 'game-afk-scene__viewport--arrow-crit-hit'
            : '',
          weapon === 'magia' && attacking && weaponId === 'magia_buraco_negro'
            ? 'game-afk-scene__viewport--blackhole-cast'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-enemy={localEnemyId}
      >
        <AfkSkyCycle showClouds={!isMobile} showSparkles={showSparkles} enemyId={localEnemyId} />

        <AfkBossProgressPanel
          killsUntilBoss={localKillsUntilBoss}
          bossActive={localIsBoss}
          bossHp={displayHp}
          bossMaxHp={snapshot.enemy_max_hp}
          bossHit={enemyHit}
          overlay
        />

        {localIsBoss && (
          <div className="game-afk-scene__boss-callout" role="status">
            Luta com Boss! Loot Bônus ao Derrotar!
          </div>
        )}

        <AfkMascotHero
          weapon={weapon}
          genero={genero}
          attacking={attacking}
          attackSeq={attackSeq}
          isCrit={attackIsCrit}
        />

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
              <span
                key={`arrow-crit-nova-${attackSeq}`}
                className="game-afk-scene-arrow-crit-nova"
                aria-hidden
              />
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
                <span
                  key={`slash-crit-wave-${attackSeq}`}
                  className="game-afk-slash-crit-wave"
                  aria-hidden
                />
                <span
                  key={`slash-crit-x-${attackSeq}`}
                  className="game-afk-sword-crit-cross"
                  aria-hidden
                />
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

        {weapon === 'magia' && attacking && (
          <span key={`spell-${attackSeq}`} className="contents">
            <AfkSpellEffect spellId={weaponId} />
          </span>
        )}

        <AfkEnemySprite
          combat={snapshot}
          userId={userId}
          spawnKillsTotal={spawnKillsTotal}
          hit={enemyHit}
          critHit={enemyHit && attackIsCrit}
          dying={dying}
          looting={looting}
          hitKey={hitSeq}
          displayHp={displayHp}
          previousDisplayHp={previousDisplayHp}
          showHpBar={!snapshot.is_boss}
        />

        {lootDropSeq > 0 && (
          <span key={`loot-drop-${lootDropSeq}`} className="game-afk-scene__loot-drop" aria-hidden>
            <Sparkles size={18} />
          </span>
        )}

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

      {onBackToVillage && (
        <button
          type="button"
          className="game-afk-scene__back-btn"
          onClick={onBackToVillage}
          aria-label="Voltar à vila"
        >
          <ArrowLeft size={16} aria-hidden />
          Voltar para a Vila
        </button>
      )}
    </div>
  );
}
