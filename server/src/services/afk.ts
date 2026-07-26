import type { UserRecord } from '../domain/User.js';
import {
  AFK_MAX_MINUTES,
  DORIA_BAG_ITEM_ID,
  EXP_INSTANT_ITEM_ID,
  FROZEN_STREAK_ITEM_ID,
  PATROL_CACHE_HOURS,
  ROUTE_DRINK_HOURS,
  ROUTE_DRINK_ITEM_ID,
  type AfkPendingReward,
} from '../types/index.js';
import { rollDailyFrozenStreak } from '../../../shared/afk/frozen-streak-drop.js';
import { afkKillsForHours, buildAfkMetaFields } from '../../../shared/utils/afk.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import { grantMoeda } from './economy.js';
import { addWeeklyXp } from './weekly-stats.js';
import { addInventoryItem } from './inventory.js';
import { normalizePending, EMPTY_AFK_PENDING } from '../repositories/user-repository.js';
import {
  combatSnapshot,
  ensureCombat,
  simulateOfflineKills,
  defeatCurrentEnemy,
} from './afk-combat.js';
import { ensureBestiario } from './bestiario.js';
import { resolvePatrolArmas, type AfkEnemyId } from '../types/index.js';

const SECRET_TITLE_ID = 'titulo_secreto';

interface AfkState {
  last_seen_at: Date | string | null;
  minutos_acumulados: number;
  pending: AfkPendingReward;
  paused_at?: Date | string | null;
}

function ensureAfk(user: UserRecord): AfkState {
  if (!user.afk || typeof user.afk !== 'object') {
    user.afk = {
      last_seen_at: null,
      minutos_acumulados: 0,
      pending: { ...EMPTY_AFK_PENDING },
    };
  }
  user.afk.pending = normalizePending(user.afk.pending);
  if (typeof user.afk.minutos_acumulados !== 'number') user.afk.minutos_acumulados = 0;
  return user.afk as AfkState;
}

/**
 * `last_seen_at` é a própria coluna persistida — null enquanto a conta nunca
 * abriu a Exploração. Reaproveitá-la como sinal de "já começou" evita um
 * flag em memória que se perderia a cada request (era o bug: o timer
 * parecia resetar toda vez que a tela era reaberta).
 */
function afkStarted(afk: AfkState): boolean {
  return afk.last_seen_at != null;
}

/** Primeira abertura da tela de Exploração AFK: liga o timer a partir de agora.
    Nasce PAUSADO (vila) — o personagem começa na vila até o jogador clicar em
    "Explorar"; sem isso, `paused_at` ficaria indefinido e o client (que decide
    onde reabrir a tela a partir dele) jogaria um personagem novo direto pra
    floresta. */
export function activateAfk(user: UserRecord, now = new Date()): void {
  const afk = ensureAfk(user);
  if (afkStarted(afk)) return;
  afk.last_seen_at = now.toISOString();
  afk.paused_at = now.toISOString();
}

function applyAfkRewardBundle(
  user: UserRecord,
  bundle: AfkPendingReward,
): {
  claimed: AfkPendingReward;
  overflow_to_dorias: number;
} {
  const claimed = normalizePending(bundle);
  let overflow_to_dorias = 0;

  if (claimed.xp > 0) {
    user.gamificacao.nivel_xp += claimed.xp;
    addWeeklyXp(user, claimed.xp);
  }
  if (claimed.abdoria > 0) {
    grantMoeda(user, claimed.abdoria);
  }
  if (claimed.frozen_streaks > 0) {
    const result = addInventoryItem(user, FROZEN_STREAK_ITEM_ID, claimed.frozen_streaks);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  if (claimed.route_drinks > 0) {
    const result = addInventoryItem(user, ROUTE_DRINK_ITEM_ID, claimed.route_drinks);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  if (claimed.exp_instant > 0) {
    const result = addInventoryItem(user, EXP_INSTANT_ITEM_ID, claimed.exp_instant);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  if (claimed.doria_bags > 0) {
    const result = addInventoryItem(user, DORIA_BAG_ITEM_ID, claimed.doria_bags);
    overflow_to_dorias += result.overflow_to_dorias;
  }
  for (const cosmeticId of claimed.cosmetic_ids) {
    if (!user.cosmeticos.desbloqueados.includes(cosmeticId)) {
      user.cosmeticos.desbloqueados.push(cosmeticId);
    }
  }
  if (claimed.titulo_secreto && !user.cosmeticos.desbloqueados.includes(SECRET_TITLE_ID)) {
    user.cosmeticos.desbloqueados.push(SECRET_TITLE_ID);
  }
  if (claimed.weapon_ids.length > 0) {
    const armas = resolvePatrolArmas(user.preferencias.patrol_armas);
    for (const weaponId of claimed.weapon_ids) {
      if (!armas.desbloqueados.includes(weaponId)) {
        armas.desbloqueados.push(weaponId);
      }
    }
    user.preferencias.patrol_armas = armas;
  }

  return { claimed, overflow_to_dorias };
}

function simulateKillsIntoPending(
  user: UserRecord,
  pending: AfkPendingReward,
  kills: number,
): void {
  ensureCombat(user);
  for (let i = 0; i < kills; i += 1) {
    defeatCurrentEnemy(user, pending);
  }
}

/** Concede recompensas equivalentes a N horas de Exploração AFK (simula kills + aplica na conta). */
export function grantPatrolCacheRewards(
  user: UserRecord,
  hours = PATROL_CACHE_HOURS,
): AfkPendingReward {
  return grantExplorationHourRewards(user, hours).claimed;
}

/** Route Drink: 1h de loot aplicado direto na conta (sem passar pelo baú). */
export function grantRouteDrinkRewards(
  user: UserRecord,
  hours = ROUTE_DRINK_HOURS,
): { claimed: AfkPendingReward; overflow_to_dorias: number } {
  return grantExplorationHourRewards(user, hours, { noSelfRouteDrink: true });
}

/**
 * Só ao usar o próprio Route Drink: nenhum dos kills simulados pode devolver
 * outro Route Drink de brinde — vira Frozen Streak (o outro drop de Elite)
 * no lugar. Sem isso o item nunca sairia do inventário de quem só usa Route
 * Drink pra tudo. Não mexe no Baú da Exploração nem no acúmulo passivo —
 * aqueles continuam podendo dropar Route Drink normalmente.
 */
function substituteRouteDrinkSelfDrops(pending: AfkPendingReward): void {
  if (pending.route_drinks <= 0) return;
  pending.frozen_streaks += pending.route_drinks;
  pending.route_drinks = 0;
}

function grantExplorationHourRewards(
  user: UserRecord,
  hours: number,
  opts?: { noSelfRouteDrink?: boolean },
): { claimed: AfkPendingReward; overflow_to_dorias: number } {
  const pending: AfkPendingReward = { ...EMPTY_AFK_PENDING };
  simulateKillsIntoPending(user, pending, afkKillsForHours(hours));
  if (opts?.noSelfRouteDrink) {
    substituteRouteDrinkSelfDrops(pending);
  }
  return applyAfkRewardBundle(user, pending);
}

/**
 * Roll diário de Frozen Streak — roda em todo sync (mesmo com o baú no teto),
 * no máximo 1 por dia. O roll é determinístico por usuário+dia, então só
 * marcamos o dia quando acerta; dias de erro podem re-rolar à vontade.
 */
function rollFrozenStreakOfTheDay(user: UserRecord, afk: AfkState): void {
  const today = getTodaySaoPaulo();
  if (user.preferencias.afk_frozen_ultimo_dia === today) return;
  if (!rollDailyFrozenStreak(String(user.id), today)) return;

  afk.pending.frozen_streaks += 1;
  afk.pending.drop_count = (afk.pending.drop_count ?? 0) + 1;
  user.preferencias.afk_frozen_ultimo_dia = today;
}

export function syncAfkRewards(user: UserRecord, now = new Date()): AfkEnemyId[] {
  const before = new Set(ensureBestiario(user));
  const afk = ensureAfk(user);

  // O timer só corre depois da primeira visita à tela de Exploração.
  if (!afkStarted(afk)) {
    return collectNewBestiaryUnlocks(before, user);
  }

  rollFrozenStreakOfTheDay(user, afk);

  // Pausado (jogador na vila) — não acumula tempo enquanto não voltar pra
  // floresta. `pauseAfk`/`resumeAfk` cuidam de creditar o que já rolou até
  // o momento da pausa e de "pular" o intervalo pausado ao retomar.
  if (afk.paused_at) {
    return collectNewBestiaryUnlocks(before, user);
  }

  const lastSeen = new Date(afk.last_seen_at!);
  const already = afk.minutos_acumulados ?? 0;

  if (already >= AFK_MAX_MINUTES) {
    afk.minutos_acumulados = AFK_MAX_MINUTES;
    afk.last_seen_at = now.toISOString();
    return collectNewBestiaryUnlocks(before, user);
  }

  const elapsedMs = Math.max(0, now.getTime() - lastSeen.getTime());
  let newMinutes = Math.floor(elapsedMs / 60_000);
  if (newMinutes <= 0) {
    // Não atualiza last_seen_at — deixa o tempo fracionário acumular até completar 1 min.
    return collectNewBestiaryUnlocks(before, user);
  }

  const room = Math.max(0, AFK_MAX_MINUTES - already);
  newMinutes = Math.min(newMinutes, room);

  const totalMinutes = already + newMinutes;

  simulateOfflineKills(user, newMinutes);

  afk.minutos_acumulados = totalMinutes;
  // Avança last_seen_at exatamente pelos minutos consumidos — preserva segundos fracionários.
  afk.last_seen_at = new Date(lastSeen.getTime() + newMinutes * 60_000).toISOString();
  return collectNewBestiaryUnlocks(before, user);
}

/**
 * Jogador entrou na vila — credita normalmente tudo até agora e trava o
 * relógio (`paused_at`). Idempotente: chamar de novo enquanto já pausado
 * não faz nada (evita perder segundos fracionários em toques repetidos).
 * Funciona mesmo antes do primeiro `activateAfk` (conta nova, timer nunca
 * ligado) — a página de Exploração abre na vila por padrão, então o
 * pedido de pausa pode chegar antes da ativação; nesse caso só marca
 * `paused_at` e não há nada pra creditar ainda.
 */
export function pauseAfk(user: UserRecord, now = new Date()): void {
  const afk = ensureAfk(user);
  if (afk.paused_at) return;
  if (afkStarted(afk)) syncAfkRewards(user, now);
  afk.paused_at = now.toISOString();
}

/**
 * Jogador voltou pra floresta — destrava o relógio e pula o cursor
 * (`last_seen_at`) direto pro agora, descartando o intervalo passado na
 * vila em vez de creditá-lo como se fosse tempo de exploração.
 */
export function resumeAfk(user: UserRecord, now = new Date()): void {
  const afk = ensureAfk(user);
  if (!afk.paused_at) return;
  afk.paused_at = null;
  afk.last_seen_at = now.toISOString();
}

function collectNewBestiaryUnlocks(before: Set<AfkEnemyId>, user: UserRecord): AfkEnemyId[] {
  return ensureBestiario(user).filter((id) => !before.has(id));
}

export function hasAfkRewardsToClaim(
  afk: { pending?: AfkPendingReward | null } | null | undefined,
): boolean {
  const p = normalizePending(afk?.pending);
  return (
    p.xp > 0 ||
    p.abdoria > 0 ||
    p.frozen_streaks > 0 ||
    p.route_drinks > 0 ||
    p.exp_instant > 0 ||
    p.doria_bags > 0 ||
    p.cosmetic_ids.length > 0 ||
    p.weapon_ids.length > 0 ||
    p.titulo_secreto
  );
}

export function claimAfkRewards(user: UserRecord): {
  claimed: AfkPendingReward;
  overflow_to_dorias: number;
} {
  const afk = ensureAfk(user);
  const { claimed, overflow_to_dorias } = applyAfkRewardBundle(user, afk.pending);

  afk.pending = { ...EMPTY_AFK_PENDING };
  afk.minutos_acumulados = 0;
  afk.last_seen_at = new Date().toISOString();

  return { claimed, overflow_to_dorias };
}

export function touchAfkPresence(user: UserRecord): AfkEnemyId[] {
  return syncAfkRewards(user);
}

export function afkResponsePayload(
  user: UserRecord,
  extra?: { arma_preferida?: string; route_drink_count?: number },
  bestiario_novos: AfkEnemyId[] = [],
) {
  const minutos = user.afk?.minutos_acumulados ?? 0;
  return {
    minutos_acumulados: minutos,
    pending: user.afk?.pending ?? { ...EMPTY_AFK_PENDING },
    has_rewards: hasAfkRewardsToClaim(user.afk),
    combat: combatSnapshot(user),
    bestiario_novos,
    // Cena real do personagem (vila = pausado, floresta = explorando) —
    // fonte de verdade pro client saber onde retomar ao reabrir a tela,
    // em vez de sempre assumir vila (AFK de verdade continua enquanto o
    // jogador não está olhando).
    paused: Boolean(user.afk?.paused_at),
    ...buildAfkMetaFields(minutos),
    ...extra,
  };
}

export { SECRET_TITLE_ID };
