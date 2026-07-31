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
