import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../src/db.js', () => ({
  getSupabase: () => ({ from: dbMocks.from }),
}));

import { Notifications } from '../src/repositories/notification-repository.js';

type QueryResponse = {
  data?: unknown;
  error: { code?: string; message: string } | null;
  count?: number | null;
};

function queryReturning(response: QueryResponse) {
  const query = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then: (
      onFulfilled: (value: QueryResponse) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(onFulfilled, onRejected),
  };

  query.select.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

const databaseError = {
  code: '42501',
  message: 'permission denied for table notifications',
};

describe('Notifications repository — propagação de erros', () => {
  beforeEach(() => {
    dbMocks.from.mockReset();
  });

  it.each([
    [
      'createMany',
      () =>
        Notifications.createMany([
          { user_id: 'user-1', tipo: 'teste', titulo: 'Nova notificação' },
        ]),
    ],
    ['listForUser', () => Notifications.listForUser('user-1')],
    ['unreadCount', () => Notifications.unreadCount('user-1')],
    ['markAllRead', () => Notifications.markAllRead('user-1')],
    ['deleteOne', () => Notifications.deleteOne('user-1', 'notification-1')],
    ['deleteAllForUser', () => Notifications.deleteAllForUser('user-1')],
  ])('propaga erro do Supabase em %s', async (_method, operation) => {
    dbMocks.from.mockReturnValue(queryReturning({ data: null, count: null, error: databaseError }));

    await expect(operation()).rejects.toBe(databaseError);
  });
});

describe('Notifications repository — ausências legítimas', () => {
  beforeEach(() => {
    dbMocks.from.mockReset();
  });

  it('não consulta o banco ao criar uma lista vazia', async () => {
    await Notifications.createMany([]);

    expect(dbMocks.from).not.toHaveBeenCalled();
  });

  it('retorna lista vazia quando a consulta não encontra notificações', async () => {
    dbMocks.from.mockReturnValue(queryReturning({ data: null, error: null }));

    await expect(Notifications.listForUser('user-1')).resolves.toEqual([]);
  });

  it('retorna zero quando não há notificações não lidas', async () => {
    dbMocks.from.mockReturnValue(queryReturning({ count: null, error: null }));

    await expect(Notifications.unreadCount('user-1')).resolves.toBe(0);
  });

  it.each([
    ['markAllRead', () => Notifications.markAllRead('user-1')],
    ['deleteOne', () => Notifications.deleteOne('user-1', 'notification-inexistente')],
    ['deleteAllForUser', () => Notifications.deleteAllForUser('user-1')],
  ])('trata %s sem linhas afetadas como sucesso', async (_method, operation) => {
    dbMocks.from.mockReturnValue(queryReturning({ data: null, error: null }));

    await expect(operation()).resolves.toBeUndefined();
  });
});
