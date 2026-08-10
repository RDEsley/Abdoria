import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { House, MapPin, Sparkles } from 'lucide-react';
import type {
  AfkCombatSnapshot,
  AfkEnemyId,
  AfkRegionDefinition,
  ArmaPreferida,
  PersonagemGenero,
} from '@/types';
import {
  AFK_BOSS_INTERVAL,
  AFK_REGIONS,
  AFK_SEARCH_DURATION_MAX_MS,
  AFK_SEARCH_DURATION_MIN_MS,
  afkDefeatDurationMs,
  advanceKillsUntilBoss,
  getAfkRegionById,
  getEnemyAttackDamage,
  getEnemyAttackIntervalSeconds,
  getEnemyMaxHp,
  getAfkRegionProgress,
  getAfkSkillTotal,
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
import { AfkSearchOverlay } from '@/components/afk/AfkSearchOverlay';
import { AfkSpellEffect } from '@/components/afk/AfkSpellEffect';
import { AfkBossProgressPanel } from '@/components/afk/AfkCombatHud';
import { useDamageFloaters } from '@/hooks/useDamageFloaters';
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
  onRegionChange?: (region: AfkRegionDefinition) => void;
  onOpenMap?: () => void;
  onEnemyDefeated?: (expectedKillsTotal: number, wasBoss: boolean) => void;
  onBackToVillage?: () => void;
  paused?: boolean;
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
  region_id: 'verdant-trail',
  region_progress: {},
  unlocked_regions: ['verdant-trail'],
  hero_hp: 250,
  hero_max_hp: 250,
  hero_defeated_until: null,
  orbs: 0,
  skill_nodes: [],
  skill_tree_free_reset_used: false,
  adventure_started: false,
  slime_language_unlocked: false,
  intro_seen: false,
  story_flags: [],
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
  onRegionChange,
  onOpenMap,
  onEnemyDefeated,
  onBackToVillage,
  paused = false,
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
  /** Intervalo entre abates: personagem procura o próximo inimigo (lupa) em
      vez de já aparecer com o próximo alvo na mira — sem isso o herói ficava
      atirando sem parar, sem nenhum respiro entre um abate e outro. `Ref`
      é checado dentro de runAttack (senão o loop do ataque continuaria
      disparando); `state` só pra desenhar a lupa/texto na tela. */
  const [searching, setSearching] = useState(false);
  const searchingRef = useRef(false);
  const [searchDurationMs, setSearchDurationMs] = useState(0);
  const [heroHp, setHeroHp] = useState(combat?.hero_hp ?? combat?.hero_max_hp ?? 250);
  const [heroDefeated, setHeroDefeated] = useState(false);
  const [reviveSeconds, setReviveSeconds] = useState(0);
  const [heroHit, setHeroHit] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [heroAttackProgress, setHeroAttackProgress] = useState(0);
  const [enemyAttackProgress, setEnemyAttackProgress] = useState(0);
  const heroDefeatedRef = useRef(false);
  const heroDefeatedUntilRef = useRef(0);
  const pausedRef = useRef(paused);
  const heroNextAttackAtRef = useRef(0);
  const enemyNextAttackAtRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const deathTimersRef = useRef<number[]>([]);
  const searchTimersRef = useRef<number[]>([]);
  const { floaters, pushDamage } = useDamageFloaters();

  const serverSnapshot = combat ?? FALLBACK_SNAPSHOT;
  const region = getAfkRegionById(combat?.region_id);

  const snapshot = useMemo<AfkCombatSnapshot>(() => {
    const enemyMaxHp = getEnemyMaxHp(localEnemyId, region.chapter);
    return {
      ...serverSnapshot,
      enemy_id: localEnemyId,
      enemy_max_hp: enemyMaxHp,
      is_boss: localIsBoss,
      elite: localIsElite,
      kills_until_boss: localKillsUntilBoss,
      kills_to_next_boss: Math.max(0, region.killsToBoss - localKillsUntilBoss),
    };
  }, [
    localEnemyId,
    localIsBoss,
    localIsElite,
    localKillsUntilBoss,
    region.chapter,
    region.killsToBoss,
    serverSnapshot,
  ]);

  const critKind = weapon;
  const damage = resolvePatrolBaseDamage(critKind, weaponId, localEnemyId);
  // Magia: ciclo mais lento, impacto tardio e cauda longa — as animações de
  // feitiço (nuvem, dragão, cristal...) precisam terminar antes do próximo ciclo.
  const attackInterval = weapon === 'arco' ? 1500 : weapon === 'magia' ? 2400 : 1900;
  const impactDelay = weapon === 'arco' ? 380 : weapon === 'magia' ? 620 : 200;
  const attackTail = weapon === 'magia' ? 1500 : 420;
  const attacking = phase === 'attack';
  const showSparkles = (hasLoot || capped) && !isMobile;
  const regionProgress = getAfkRegionProgress(spawnKillsTotal, region.id);
  const skillNodesKey = (combat?.skill_nodes ?? []).join('|');
  const skillNodes = useMemo(
    () => (skillNodesKey ? skillNodesKey.split('|') : []),
    [skillNodesKey],
  );
  const combatHeroHp = combat?.hero_hp;
  const heroMaxHp = combat?.hero_max_hp ?? 250;
  const enemyAttackIntervalMs =
    getEnemyAttackIntervalSeconds(localIsBoss ? 'boss' : localIsElite ? 'elite' : 'common') * 1000;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onRegionChange?.(region);
  }, [onRegionChange, region]);

  // O fundo seguinte fica pronto durante a luta do chefe; assim a troca de
  // região acontece depois da vitória sem uma imagem surgindo atrasada.
  useEffect(() => {
    if (!localIsBoss || typeof Image === 'undefined') return;
    const nextRegion = AFK_REGIONS[regionProgress.regionIndex + 1];
    if (!nextRegion) return;
    const image = new Image();
    image.src = nextRegion.backgroundUrl;
  }, [localIsBoss, regionProgress.regionIndex]);

  useEffect(() => {
    if (combatHeroHp == null) return;
    setHeroHp(combatHeroHp);
    const defeated = Boolean(
      combat?.hero_defeated_until && new Date(combat.hero_defeated_until).getTime() > Date.now(),
    );
    setHeroDefeated(defeated);
    heroDefeatedRef.current = defeated;
    const until = defeated ? new Date(combat?.hero_defeated_until ?? 0).getTime() : 0;
    heroDefeatedUntilRef.current = until;
    setReviveSeconds(defeated ? Math.max(1, Math.ceil((until - Date.now()) / 1000)) : 0);
  }, [combat?.hero_defeated_until, combatHeroHp]);

  useEffect(() => {
    if (!heroDefeated) return undefined;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((heroDefeatedUntilRef.current - Date.now()) / 1000));
      setReviveSeconds(remaining);
      if (remaining === 0) {
        heroDefeatedRef.current = false;
        heroDefeatedUntilRef.current = 0;
        setHeroDefeated(false);
        setHeroHp(heroMaxHp);
      }
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [heroDefeated, heroMaxHp]);

  useEffect(() => {
    const update = () => {
      if (paused || searchingRef.current || heroDefeatedRef.current) {
        setHeroAttackProgress(0);
        setEnemyAttackProgress(0);
        return;
      }
      const now = performance.now();
      setHeroAttackProgress(
        Math.max(0, Math.min(1, 1 - (heroNextAttackAtRef.current - now) / attackInterval)),
      );
      setEnemyAttackProgress(
        Math.max(0, Math.min(1, 1 - (enemyNextAttackAtRef.current - now) / enemyAttackIntervalMs)),
      );
    };
    update();
    const timer = window.setInterval(update, 50);
    return () => window.clearInterval(timer);
  }, [attackInterval, enemyAttackIntervalMs, paused]);

  useEffect(() => {
    const tier = localIsBoss ? 'boss' : localIsElite ? 'elite' : 'common';
    const intervalMs = getEnemyAttackIntervalSeconds(tier) * 1000;
    enemyNextAttackAtRef.current = performance.now() + intervalMs;
    const pendingTimers: number[] = [];
    const later = (callback: () => void, delay: number) => {
      pendingTimers.push(window.setTimeout(callback, delay));
    };
    const attack = () => {
      enemyNextAttackAtRef.current = performance.now() + intervalMs;
      if (
        pausedRef.current ||
        searchingRef.current ||
        heroDefeatedRef.current ||
        killHandledRef.current
      )
        return;
      setEnemyAttacking(true);
      later(() => {
        if (
          pausedRef.current ||
          searchingRef.current ||
          heroDefeatedRef.current ||
          killHandledRef.current
        ) {
          setEnemyAttacking(false);
          return;
        }
        setEnemyAttacking(false);
        setHeroHit(true);
        later(() => setHeroHit(false), 360);
        const damage = getEnemyAttackDamage(localEnemyIdRef.current, region.chapter, heroMaxHp);
        setHeroHp((current) => {
          const next = Number.isFinite(damage) ? Math.max(0, current - damage) : 0;
          if (next <= 0) {
            heroDefeatedRef.current = true;
            setHeroDefeated(true);
            const duration = afkDefeatDurationMs(skillNodes);
            const defeatedUntil = Date.now() + duration;
            heroDefeatedUntilRef.current = defeatedUntil;
            setReviveSeconds(Math.ceil(duration / 1000));
          }
          return next;
        });
      }, 260);
    };
    const timer = window.setInterval(attack, intervalMs);
    return () => {
      window.clearInterval(timer);
      pendingTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [heroMaxHp, localIsBoss, localIsElite, paused, region.chapter, skillNodes]);

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
  const syncedRegionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!combat) return;

    const serverKills = combat.kills_total;
    const localKills = killsTotalRef.current;
    const regionChanged = syncedRegionRef.current !== combat.region_id;
    if (hasSyncedRef.current && !regionChanged && serverKills <= localKills) return;

    // Só a 1ª sincronização troca o inimigo/vida visíveis na hora — reflete
    // onde a exploração realmente está ao abrir a tela (depois de ausência,
    // claim, etc). Da 2ª em diante, só absorve o contador sem tocar no
    // inimigo/vida: o servidor "tica" num ritmo fixo (8 kills/min) que não
    // tem relação com o tempo real de abater um boss/elite na tela — sem essa
    // trava, o poll de 15s cortava a luta local no meio (o inimigo trocava
    // sem morrer de verdade, parecendo "morrer antes da vida acabar").
    if (!hasSyncedRef.current || regionChanged) {
      hasSyncedRef.current = true;
      syncedRegionRef.current = combat.region_id;
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      deathTimersRef.current.forEach((id) => window.clearTimeout(id));
      deathTimersRef.current = [];
      searchTimersRef.current.forEach((id) => window.clearTimeout(id));
      searchTimersRef.current = [];
      searchingRef.current = false;
      setSearching(false);
      setDying(false);
      setLooting(false);
      setPhase('idle');
      const remainingSearch = Math.max(0, combat.search_remaining_ms ?? 0);
      if (remainingSearch > 0) {
        searchingRef.current = true;
        setSearching(true);
        setSearchDurationMs(remainingSearch);
        searchTimersRef.current.push(
          window.setTimeout(() => {
            searchingRef.current = false;
            setSearching(false);
          }, remainingSearch),
        );
      }
      killsTotalRef.current = serverKills;
      setLocalKillsUntilBoss(combat.kills_until_boss);
      setLocalIsBoss(combat.is_boss);
      setLocalIsElite(combat.elite);
      setLocalEnemyId(combat.enemy_id);
      setSpawnKillsTotal(combat.kills_total);
      localIsBossRef.current = combat.is_boss;
      localEnemyIdRef.current = combat.enemy_id;
      localKillsUntilBossRef.current = combat.kills_until_boss;
      const syncedEnemyHp =
        combat.enemy_hp > 0
          ? combat.enemy_hp
          : getEnemyMaxHp(combat.enemy_id, getAfkRegionById(combat.region_id).chapter);
      setDisplayHp(syncedEnemyHp);
      setPreviousDisplayHp(syncedEnemyHp);
      displayHpRef.current = syncedEnemyHp;
      killHandledRef.current = false;
      return;
    }

    killsTotalRef.current = serverKills;
  }, [combat]);

  const respawnLocalEnemy = useCallback(
    (killsUntilBoss: number, killsTotal: number) => {
      const picked = resolveNextSpawn(
        userId,
        killsUntilBoss,
        killsTotal,
        localEnemyIdRef.current,
        region.id,
      );

      setLocalEnemyId(picked.enemy_id);
      setLocalIsBoss(picked.is_boss);
      setLocalIsElite(picked.elite);
      setSpawnKillsTotal(killsTotal);
      localIsBossRef.current = picked.is_boss;
      localEnemyIdRef.current = picked.enemy_id;
      const freshHp = getEnemyMaxHp(picked.enemy_id, region.chapter);
      setDisplayHp(freshHp);
      // Inimigo novo: sem isso, o rastro da barra "puxava" do valor quase
      // zero do bicho anterior até o HP cheio do novo, parecendo a barra
      // enchendo em vez de só aparecer cheia.
      setPreviousDisplayHp(freshHp);
      displayHpRef.current = freshHp;
      killHandledRef.current = false;
    },
    [region.chapter, region.id, userId],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const scheduleDeath = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      deathTimersRef.current = deathTimersRef.current.filter((timerId) => timerId !== id);
      fn();
    }, ms);
    deathTimersRef.current.push(id);
  }, []);

  const scheduleSearch = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    searchTimersRef.current.push(id);
  }, []);

  useEffect(() => {
    clearTimers();

    const runAttack = () => {
      heroNextAttackAtRef.current = performance.now() + attackInterval;
      // Sem inimigo em cena (procurando o próximo) — o intervalo continua
      // rodando de fundo, só não faz nada até a busca terminar.
      if (pausedRef.current || searchingRef.current || heroDefeatedRef.current) return;

      const enemyId = localEnemyIdRef.current;
      const critSkill = getAfkSkillTotal(
        skillNodes,
        critKind === 'arco'
          ? 'bow_crit_pct'
          : critKind === 'espada'
            ? 'sword_crit_pct'
            : 'magic_damage_pct',
      );
      const critChance =
        resolvePatrolCritChancePercent(critKind, weaponId, enemyId) +
        (critKind === 'magia' ? 0 : critSkill);
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

        const damageSkill = getAfkSkillTotal(
          skillNodes,
          critKind === 'arco'
            ? 'bow_damage_pct'
            : critKind === 'espada'
              ? 'sword_damage_pct'
              : 'magic_damage_pct',
        );
        const critDamageSkill = isCrit ? getAfkSkillTotal(skillNodes, 'crit_damage_pct') : 0;
        const hitDamage = Math.max(
          1,
          Math.round(attack.damage * (1 + (damageSkill + critDamageSkill) / 100)),
        );
        const hpBefore = displayHpRef.current;
        const next = attack.isHitKill ? 0 : hpBefore - hitDamage;

        setPreviousDisplayHp(hpBefore);
        displayHpRef.current = Math.max(0, next);

        setEnemyHit(true);
        setHitSeq((n) => n + 1);
        pushDamage(hitDamage, isCrit);
        setDisplayHp(Math.max(0, next));

        if (next > 0) return;

        // Trava o abate JÁ (evita golpe atrasado reabrindo a sequência ou
        // dobrando a contagem) — mas o visual de "dying" espera a barra de
        // vida terminar de esvaziar (transition de 0.15s) antes de sumir.
        // `dying` tira a barra do DOM na hora; sem esse atraso, o slime
        // "morria" com a barra ainda a meio caminho, nunca chegando a 0%.
        killHandledRef.current = true;
        critStreakRef.current = 0;

        scheduleDeath(() => {
          setDying(true);
          // Sequência da morte: o slime encolhe (dying) → os acessórios se
          // soltam e caem (looting) → o item pula → vira bolinha e voa pro
          // baú, que dá uma mexida a cada chegada.
          scheduleDeath(() => setLooting(true), 120);

          const wasBossKill = localIsBossRef.current;
          const wasEliteKill = localIsEliteRef.current;
          const orbCount = wasBossKill ? 5 : wasEliteKill ? 3 : 2;
          // Boss/elite sempre rendem a cena inteira; comum entra em parte dos
          // abates pra não virar poluição visual a cada 2 segundos.
          const showDrop =
            hasLootRef.current && (wasBossKill || wasEliteKill || Math.random() < 0.45);

          if (showDrop) {
            scheduleDeath(() => setLootDropSeq((n) => n + 1), 150);
            scheduleDeath(() => {
              const enemyEl = viewportRef.current?.querySelector('.game-afk-enemy');
              emitAfkLootOrbs(orbCount, enemyEl);
            }, 300);
          }

          scheduleDeath(() => {
            const nextKillsTotal = killsTotalRef.current + 1;
            const nextKills = advanceKillsUntilBoss(
              localKillsUntilBossRef.current,
              wasBossKill,
              region.killsToBoss,
            );
            localKillsUntilBossRef.current = nextKills;
            killsTotalRef.current = nextKillsTotal;
            setLocalKillsUntilBoss(nextKills);
            setDying(false);
            setLooting(false);
            setEnemyHit(false);
            onEnemyDefeated?.(nextKillsTotal - 1, wasBossKill);

            // Intervalo de busca (5-10s) antes do próximo inimigo aparecer —
            // a lupa permanece fixa durante esse intervalo. Sem inimigo em
            // cena e com runAttack pulando enquanto
            // searchingRef está true, o herói para de atirar até achar o
            // próximo alvo.
            searchingRef.current = true;
            setSearching(true);
            const searchDuration = Math.max(
              2_500,
              AFK_SEARCH_DURATION_MIN_MS +
                Math.random() * (AFK_SEARCH_DURATION_MAX_MS - AFK_SEARCH_DURATION_MIN_MS) -
                getAfkSkillTotal(skillNodes, 'search_reduction_ms'),
            );
            setSearchDurationMs(searchDuration);
            scheduleSearch(() => {
              searchingRef.current = false;
              setSearching(false);
              respawnLocalEnemy(nextKills, nextKillsTotal);
            }, searchDuration);
          }, 720);
        }, 180);
      }, impactDelay);

      schedule(() => {
        setEnemyHit(false);
        setPhase('idle');
      }, impactDelay + attackTail);
    };

    if (paused) return () => clearTimers();
    heroNextAttackAtRef.current = performance.now() + attackInterval;
    const combatTimer = window.setInterval(runAttack, attackInterval);

    return () => {
      window.clearInterval(combatTimer);
      clearTimers();
      // Defesa contra "procurando" travar pra sempre: se o efeito reiniciar
      // (troca de arma, respawn) bem no meio da busca, clearTimers() acima
      // cancela o timer que a encerraria, sem nada resetar searchingRef —
      // o herói ficava preso na animação da lupa sem nunca voltar a atacar.
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
    scheduleDeath,
    snapshot.enemy_max_hp,
    weapon,
    weaponId,
    critKind,
    skillNodes,
    onEnemyDefeated,
    paused,
    region.killsToBoss,
    scheduleSearch,
  ]);

  useEffect(
    () => () => {
      clearTimers();
      deathTimersRef.current.forEach((id) => window.clearTimeout(id));
      deathTimersRef.current = [];
      searchTimersRef.current.forEach((id) => window.clearTimeout(id));
      searchTimersRef.current = [];
    },
    [clearTimers],
  );

  return (
    <div className="game-afk-scene">
      <AfkLootOrbLayer />
      <div
        ref={viewportRef}
        className={[
          'game-afk-scene__viewport',
          `game-afk-scene__viewport--region-${region.id}`,
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
        data-region={region.id}
        style={
          {
            '--afk-region-bg': `url("${region.backgroundUrl}")`,
            '--afk-region-accent': region.accent,
          } as CSSProperties
        }
      >
        <AfkSkyCycle showClouds={!isMobile} showSparkles={showSparkles} enemyId={localEnemyId} />

        <button
          type="button"
          className="game-afk-scene__region-chip"
          aria-label={`Abrir mapa. Região atual: ${region.name}`}
          onClick={onOpenMap}
        >
          <MapPin size={12} aria-hidden />
          <span>{region.name}</span>
        </button>

        <AfkBossProgressPanel
          killsUntilBoss={localKillsUntilBoss}
          targetKills={region.killsToBoss}
          bossActive={localIsBoss}
          bossHp={displayHp}
          bossMaxHp={snapshot.enemy_max_hp}
          bossHit={enemyHit}
          overlay
        />

        <AfkMascotHero
          weapon={weapon}
          genero={genero}
          attacking={attacking}
          attackSeq={attackSeq}
          isCrit={attackIsCrit}
          searching={searching}
          defeated={heroDefeated}
          hit={heroHit}
        />
        {!searching ? (
          <span
            className="game-afk-attack-clock game-afk-attack-clock--hero"
            style={{ '--attack-angle': `${heroAttackProgress * 360}deg` } as CSSProperties}
            role="progressbar"
            aria-label="Tempo até o próximo ataque do herói"
            aria-valuenow={Math.round(heroAttackProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i />
          </span>
        ) : null}

        <div className={`game-afk-hero-hp${heroHit ? ' game-afk-hero-hp--hit' : ''}`}>
          <span>HP</span>
          <div>
            <i
              style={{
                width: `${Math.max(0, Math.min(100, (heroHp / heroMaxHp) * 100))}%`,
              }}
            />
          </div>
          <strong className="tabular-nums">
            {Math.ceil(heroHp)}/{heroMaxHp}
          </strong>
        </div>
        {heroDefeated ? (
          <>
            <div
              key={combat?.hero_defeated_until ?? 'local-knockout'}
              className="game-afk-hero-knockout"
              aria-hidden
            >
              Nocauteado!
            </div>
            <div className="game-afk-hero-defeated" role="status">
              Levanta em <strong>{reviveSeconds}s</strong>
            </div>
          </>
        ) : null}

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

        {searching ? (
          <AfkSearchOverlay durationMs={searchDurationMs} />
        ) : (
          <AfkEnemySprite
            combat={snapshot}
            userId={userId}
            spawnKillsTotal={spawnKillsTotal}
            hit={enemyHit}
            critHit={enemyHit && attackIsCrit}
            dying={dying}
            looting={looting}
            attacking={enemyAttacking}
            hitKey={hitSeq}
            displayHp={displayHp}
            previousDisplayHp={previousDisplayHp}
            showHpBar={!snapshot.is_boss}
            attackProgress={enemyAttackProgress}
          />
        )}

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

        {onBackToVillage && (
          <button
            type="button"
            className="game-afk-scene__back-btn"
            onClick={onBackToVillage}
            aria-label="Voltar à Vila Abdoria"
          >
            <span className="game-afk-scene__back-btn-icon" aria-hidden>
              <House size={15} />
            </span>
            <span>Vila</span>
          </button>
        )}
      </div>
    </div>
  );
}
