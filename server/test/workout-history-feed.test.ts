import { describe, expect, it } from 'vitest';
import { buildFeedPage, parseFeedCursor } from '../src/services/workout-history-feed.js';
import type { WorkoutHistoryDocument } from '../src/repositories/workout-history-repository.js';

function session(overrides: Partial<WorkoutHistoryDocument> = {}): WorkoutHistoryDocument {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000000',
    usuario_id: 'user-1',
    treino_nome: 'Treino',
    exercicios: [],
    duracao_total_segundos: 60,
    xp_ganho: 10,
    concluido_em: '2026-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('buildFeedPage', () => {
  it('conta com menos treinos que o limite: não há próxima página', () => {
    const fetched = [session(), session({ id: 'a1b2c3d4-0000-4000-8000-000000000001' })];
    const { items, next_cursor } = buildFeedPage(fetched, 20);
    expect(items).toHaveLength(2);
    expect(next_cursor).toBeNull();
  });

  it('conta com exatamente `limit` treinos: não há próxima página', () => {
    const fetched = [session(), session({ id: 'a1b2c3d4-0000-4000-8000-000000000001' })];
    const { items, next_cursor } = buildFeedPage(fetched, 2);
    expect(items).toHaveLength(2);
    expect(next_cursor).toBeNull();
  });

  it('mais treinos que o limite: corta o extra e deriva o cursor do último item retido', () => {
    const fetched = [
      session({
        id: 'a1b2c3d4-0000-4000-8000-000000000000',
        concluido_em: '2026-01-03T00:00:00.000Z',
      }),
      session({
        id: 'a1b2c3d4-0000-4000-8000-000000000001',
        concluido_em: '2026-01-02T00:00:00.000Z',
      }),
      session({
        id: 'a1b2c3d4-0000-4000-8000-000000000002',
        concluido_em: '2026-01-01T00:00:00.000Z',
      }),
    ];
    const { items, next_cursor } = buildFeedPage(fetched, 2);
    expect(items).toHaveLength(2);
    expect(next_cursor).toEqual({
      concluido_em: '2026-01-02T00:00:00.000Z',
      id: 'a1b2c3d4-0000-4000-8000-000000000001',
    });
  });

  it('desempata por id quando duas sessões têm o mesmo concluido_em', () => {
    const tiedTimestamp = '2026-01-02T00:00:00.000Z';
    const fetched = [
      session({ id: 'a1b2c3d4-0000-4000-8000-000000000003', concluido_em: tiedTimestamp }),
      session({ id: 'a1b2c3d4-0000-4000-8000-000000000002', concluido_em: tiedTimestamp }),
      session({
        id: 'a1b2c3d4-0000-4000-8000-000000000001',
        concluido_em: '2026-01-01T00:00:00.000Z',
      }),
    ];
    const { next_cursor } = buildFeedPage(fetched, 2);
    // o cursor carrega o id do último item retido, não só o timestamp —
    // é isso que permite ao repositório retomar exatamente dali na próxima página
    // mesmo com dois registros empatados no mesmo concluido_em.
    expect(next_cursor).toEqual({
      concluido_em: tiedTimestamp,
      id: 'a1b2c3d4-0000-4000-8000-000000000002',
    });
  });
});

describe('parseFeedCursor', () => {
  it('sem cursor (primeira página): retorna null', () => {
    expect(parseFeedCursor(undefined, undefined)).toBeNull();
  });

  it('cursor válido: retorna o par concluido_em/id', () => {
    const result = parseFeedCursor(
      '2026-01-01T12:00:00.000Z',
      'a1b2c3d4-0000-4000-8000-000000000000',
    );
    expect(result).toEqual({
      concluido_em: '2026-01-01T12:00:00.000Z',
      id: 'a1b2c3d4-0000-4000-8000-000000000000',
    });
  });

  it('data inválida: rejeita', () => {
    expect(parseFeedCursor('nao-e-uma-data', 'a1b2c3d4-0000-4000-8000-000000000000')).toBe(
      'invalid',
    );
  });

  it('id malformado (não-UUID): rejeita — evita injeção no filtro .or() do Supabase', () => {
    expect(parseFeedCursor('2026-01-01T12:00:00.000Z', '),or=(usuario_id.neq.x')).toBe('invalid');
  });

  it('só um dos dois presentes: rejeita', () => {
    expect(parseFeedCursor('2026-01-01T12:00:00.000Z', undefined)).toBe('invalid');
  });
});
