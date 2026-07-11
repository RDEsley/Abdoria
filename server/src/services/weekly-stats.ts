import type { UserRecord } from '../domain/User.js';
import type { LeaderboardMetric, WeekStats } from '../types/index.js';
import { getSaoPauloWeekday, getTodaySaoPaulo } from '../utils/timezone.js';

/** Chave da semana que termina no domingo (início domingo em SP). */
export function getSundayWeekKey(date = new Date()): string {
  const today = getTodaySaoPaulo(date);
  const weekday = getSaoPauloWeekday(date);
  const [y, m, d] = today.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() - weekday);
  const yy = anchor.getUTCFullYear();
  const mm = String(anchor.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anchor.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function emptyWeekStats(weekKey: string): WeekStats {
  return { week_key: weekKey, xp: 0, moedas: 0 };
}

/**
 * Garante os acumuladores da semana corrente. Na virada, a semana anterior é
 * preservada em `week_stats_prev` até o payout de domingo processar.
 */
export function ensureWeekStats(user: UserRecord, weekKey = getSundayWeekKey()): WeekStats {
  const current = user.gamificacao.week_stats;
  if (!current || current.week_key !== weekKey) {
    if (current) user.gamificacao.week_stats_prev = current;
    user.gamificacao.week_stats = emptyWeekStats(weekKey);
  }
  return user.gamificacao.week_stats!;
}

/** Registra ganho de XP na semana corrente (só ganhos contam — gasto não desconta). */
export function addWeeklyXp(user: UserRecord, amount: number): void {
  if (amount <= 0) return;
  ensureWeekStats(user).xp += amount;
}

/** Registra ganho de Dorias na semana corrente (só ganhos contam — compra não desconta). */
export function addWeeklyMoedas(user: UserRecord, amount: number): void {
  if (amount <= 0) return;
  ensureWeekStats(user).moedas += amount;
}

/** Hash determinístico simples pra atividade semanal dos NPCs demo. */
function npcWeekSeed(userId: string, weekKey: string): number {
  const input = `${userId}:${weekKey}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Valor semanal efetivo de um usuário pra métrica, sem mutar o documento.
 * NPCs demo ganham atividade semanal determinística (estável dentro da semana)
 * pra o ranking semanal não ficar vazio.
 */
export function weeklyMetricValue(
  user: Pick<UserRecord, 'id' | 'is_demo_npc'> & {
    gamificacao: { week_stats?: WeekStats; week_stats_prev?: WeekStats };
  },
  metric: Exclude<LeaderboardMetric, 'streak'>,
  weekKey = getSundayWeekKey(),
): number {
  if (user.is_demo_npc) {
    const seed = npcWeekSeed(user.id, weekKey);
    return metric === 'xp' ? 80 + (seed % 640) : 8 + (seed % 64);
  }
  const stats =
    user.gamificacao.week_stats?.week_key === weekKey
      ? user.gamificacao.week_stats
      : user.gamificacao.week_stats_prev?.week_key === weekKey
        ? user.gamificacao.week_stats_prev
        : null;
  if (!stats) return 0;
  return metric === 'xp' ? stats.xp : stats.moedas;
}
