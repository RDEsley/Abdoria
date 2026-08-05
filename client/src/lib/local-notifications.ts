import type { AppNotification } from '@/lib/api/notifications';
import type { DashboardStats } from '@/types';
import {
  formatCountdown,
  getTodaySaoPaulo,
  secondsUntilSaoPauloMidnight,
} from '@shared/utils/timezone';

/**
 * Avisos gerados no client a partir do estado atual (não persistem no server):
 * lembrete de treino, sequência perto de expirar e estoque de Frozen Streak.
 * IDs são estáveis por dia — dispensar um aviso o silencia até o dia virar.
 */
const DISMISS_KEY = 'abdoria_local_notices_dismissed';
const RESET_WINDOW_SECONDS = 5 * 3600;

function dismissedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function isLocalNotice(id: string): boolean {
  return id.startsWith('local-');
}

export function dismissLocalNotice(id: string): void {
  const set = dismissedSet();
  set.add(id);
  // Mantém só os ids do dia corrente pra chave não crescer para sempre.
  const today = getTodaySaoPaulo();
  localStorage.setItem(
    DISMISS_KEY,
    JSON.stringify([...set].filter((entry) => entry.endsWith(today))),
  );
}

export function buildLocalNotices(stats: DashboardStats | null): AppNotification[] {
  if (!stats) return [];

  const today = getTodaySaoPaulo();
  const now = new Date().toISOString();
  const seconds = secondsUntilSaoPauloMidnight();
  const notices: AppNotification[] = [];

  // Aviso de expiração olha `sequencia_garantida_hoje` (treino OU Atividade),
  // não `treino_hoje`: quem sustentou o dia só com Atividades já está seguro e
  // não pode receber alerta de que a sequência vai zerar.
  const sequenciaGarantida = stats.sequencia_garantida_hoje ?? stats.treino_hoje;

  if (!sequenciaGarantida && stats.streak_atual > 0 && seconds <= RESET_WINDOW_SECONDS) {
    if (stats.frozen_streak_count > 0) {
      notices.push({
        id: `local-frozen-uso-${today}`,
        tipo: 'streak_frozen',
        titulo: 'Frozen Streak de prontidão',
        corpo: `Faltam ${formatCountdown(seconds)} pro dia virar. Se você não treinar, 1 Frozen Streak será usado pra congelar sua sequência de ${stats.streak_atual} dia(s).`,
        payload: {},
        lida_em: null,
        criada_em: now,
      });
    } else {
      notices.push({
        id: `local-reset-${today}`,
        tipo: 'streak_reset',
        titulo: `Sua sequência expira em ${formatCountdown(seconds)}!`,
        corpo: `Sem Frozen Streak no inventário: treine (ou complete Atividades no dia de descanso) pra não perder ${stats.streak_atual} dia(s) de sequência.`,
        payload: {},
        lida_em: null,
        criada_em: now,
      });
    }
  } else if (!stats.treino_hoje) {
    notices.push({
      id: `local-lembrete-${today}`,
      tipo: 'lembrete_treino',
      titulo: 'Sua missão de hoje te espera',
      // Com o dia já garantido por Atividades, prometer "manter a sequência
      // viva" seria mentira — o convite aqui é pelo XP do treino.
      corpo: sequenciaGarantida
        ? 'Sua sequência de hoje já está garantida. O treino ainda rende o XP do dia.'
        : 'Alguns minutos bastam pra manter a sequência viva e garantir o XP do dia.',
      payload: {},
      lida_em: now,
      criada_em: now,
    });
  }

  if (stats.frozen_streak_count === 1) {
    notices.push({
      id: `local-frozen-ultimo-${today}`,
      tipo: 'frozen_baixo',
      titulo: 'Último Frozen Streak no inventário',
      corpo: 'Depois dele, um dia sem treino zera a sequência. A Exploração dropa mais.',
      payload: {},
      lida_em: now,
      criada_em: now,
    });
  } else if (stats.frozen_streak_count === 0 && stats.streak_atual >= 3) {
    notices.push({
      id: `local-frozen-zero-${today}`,
      tipo: 'frozen_baixo',
      titulo: 'Sequência desprotegida',
      corpo: `Seus ${stats.streak_atual} dias de sequência estão sem Frozen Streak de reserva — a Exploração é a melhor fonte.`,
      payload: {},
      lida_em: now,
      criada_em: now,
    });
  }

  const dismissed = dismissedSet();
  return notices.filter((notice) => !dismissed.has(notice.id));
}
