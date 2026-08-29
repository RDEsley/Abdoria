/**
 * "Recuperar Streak" — sistema estilo Duolingo: paga Coins pra restaurar uma
 * sequência recém-perdida, sem precisar reconstruir do zero.
 *
 * Regras:
 * - Só existe DEPOIS que o jogador perdeu o streak de verdade (sem Frozen
 *   Streak cobrindo) `STREAK_RECOVERY_UNLOCK_LOSSES` vezes na vida da conta —
 *   não é uma rede de segurança de sempre, é pensado pra quem mostra um
 *   padrão real de perder a sequência (e por isso precisa do empurrão pra
 *   não desistir do app de vez).
 * - Custo = dias perdidos × `STREAK_RECOVERY_COST_PER_DAY`.
 * - A oferta desaparece sozinha se o jogador reconstruir o streak até o
 *   mesmo tamanho por conta própria, sem pagar (ver uso em
 *   server/src/services/gamification.ts).
 */
export const STREAK_RECOVERY_COST_PER_DAY = 500;
export const STREAK_RECOVERY_UNLOCK_LOSSES = 3;

/**
 * "Igualar ao recorde" — clicar no tile de Streak (recorde) na Evolução do
 * perfil paga um valor fixo pra puxar `streak_atual` até `streak_maior` na
 * hora, sem precisar reconstruir a sequência dia a dia. Só disponível
 * quando o streak atual está abaixo do recorde (senão não há o que igualar).
 */
export const STREAK_RECORD_MATCH_COST = 10000;

export interface StreakRecoveryOffer {
  /** Dias de streak perdidos — também define o custo (dias × custo por dia). */
  dias_perdidos: number;
  custo_coins: number;
  /** Data (YYYY-MM-DD, America/Sao_Paulo) em que a sequência quebrou. */
  perdido_em: string;
}

export interface StreakRecoveryReceipt {
  perdido_em: string;
  dias_restaurados: number;
  custo_coins: number;
  recuperado_em: string;
}

export interface StreakRecoveryAnchor {
  recovered_at: string;
  base_streak: number;
}

function addDays(dayKey: string, amount: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return date.toISOString().slice(0, 10);
}

/** Reaplica a recuperação persistida sobre o cálculo derivado do histórico. */
export function applyStreakRecoveryAnchor(
  anchor: StreakRecoveryAnchor | null | undefined,
  activeDays: string[],
  today: string,
): { streak: number; active: boolean } {
  if (!anchor) return { streak: 0, active: false };
  const days = new Set(activeDays);
  let cursor = addDays(anchor.recovered_at, 1);
  let additions = 0;
  while (cursor < today) {
    if (!days.has(cursor)) return { streak: 0, active: false };
    additions += 1;
    cursor = addDays(cursor, 1);
  }
  if (cursor === today && days.has(today)) additions += 1;
  return { streak: anchor.base_streak + additions, active: true };
}

export function buildStreakRecoveryOffer(
  diasPerdidos: number,
  perdidoEm: string,
): StreakRecoveryOffer {
  return {
    dias_perdidos: diasPerdidos,
    custo_coins: diasPerdidos * STREAK_RECOVERY_COST_PER_DAY,
    perdido_em: perdidoEm,
  };
}
