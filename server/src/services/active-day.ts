import type { ActiveDaySource } from '../../../shared/active-day.js';
import { ActiveDays } from '../repositories/active-days-repository.js';

/**
 * Única porta de entrada do Dia Ativo / Streak.
 * Toda ação diária válida (treino, atividade, rotina, hidratação futura) passa daqui.
 */
export async function recordValidDailyAction(
  userId: string,
  source: ActiveDaySource,
  at = new Date(),
) {
  return ActiveDays.record(userId, source, at);
}

export { ActiveDays };
