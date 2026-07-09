import type { WorkoutHistoryDocument } from '../repositories/workout-history-repository.js';

export interface FeedCursor {
  concluido_em: string;
  id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida um cursor vindo de query params antes de usá-lo num filtro `.or()` do Supabase. */
export function parseFeedCursor(
  concluidoEmRaw: unknown,
  idRaw: unknown,
): FeedCursor | null | 'invalid' {
  if (concluidoEmRaw === undefined && idRaw === undefined) return null;
  if (typeof concluidoEmRaw !== 'string' || typeof idRaw !== 'string') return 'invalid';
  if (Number.isNaN(Date.parse(concluidoEmRaw))) return 'invalid';
  if (!UUID_RE.test(idRaw)) return 'invalid';
  return { concluido_em: concluidoEmRaw, id: idRaw };
}

/**
 * Busca `limit + 1` registros e monta a página: corta o extra e deriva o
 * próximo cursor dele, ou `null` quando a busca trouxe `limit` itens ou menos
 * (não há próxima página — cobre contas com menos treinos que o tamanho da página).
 */
export function buildFeedPage(
  fetched: WorkoutHistoryDocument[],
  limit: number,
): { items: WorkoutHistoryDocument[]; next_cursor: FeedCursor | null } {
  const hasMore = fetched.length > limit;
  const items = hasMore ? fetched.slice(0, limit) : fetched;
  const last = items[items.length - 1];
  const next_cursor =
    hasMore && last ? { concluido_em: String(last.concluido_em), id: last.id } : null;
  return { items, next_cursor };
}
