import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../src/db.js', () => ({
  getSupabase: () => ({ from: dbMocks.from }),
}));

import { WorkoutHistory } from '../src/repositories/workout-history-repository.js';

type QueryResponse = {
  data: unknown;
  error: { code?: string; message: string } | null;
  count?: number | null;
};

function queryReturning(response: QueryResponse, singleResponse: QueryResponse = response) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve(singleResponse)),
    then: (
      onFulfilled: (value: QueryResponse) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(onFulfilled, onRejected),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lt.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

const databaseError = {
  code: 'XX000',
  message: 'Falha inesperada no Postgres',
};

describe('WorkoutHistory repository — propagação de erros', () => {
  beforeEach(() => {
    dbMocks.from.mockReset();
  });

  it('propaga erro ao listar o histórico', async () => {
    dbMocks.from.mockReturnValue(queryReturning({ data: null, error: databaseError }));

    await expect(WorkoutHistory.find({ usuario_id: 'user-1' })).rejects.toBe(databaseError);
  });

  it('propaga erro ao buscar a entrada mais recente', async () => {
    const query = queryReturning({ data: null, error: null }, { data: null, error: databaseError });
    dbMocks.from.mockReturnValue(query);

    await expect(WorkoutHistory.findOne({ usuario_id: 'user-1' })).rejects.toBe(databaseError);
  });

  it('propaga erro comum ao verificar existência de treino', async () => {
    dbMocks.from.mockReturnValue(queryReturning({ data: null, count: null, error: databaseError }));

    await expect(WorkoutHistory.exists({ usuario_id: 'user-1', somenteTreino: true })).rejects.toBe(
      databaseError,
    );
  });

  it('mantém fallback apenas quando a coluna atividade ainda não existe', async () => {
    const missingColumn = {
      code: '42703',
      message: 'column atividade does not exist',
    };
    dbMocks.from
      .mockReturnValueOnce(queryReturning({ data: null, count: null, error: missingColumn }))
      .mockReturnValueOnce(queryReturning({ data: null, count: 1, error: null }));

    await expect(
      WorkoutHistory.exists({ usuario_id: 'user-1', somenteTreino: true }),
    ).resolves.toBe(true);
    expect(dbMocks.from).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      'agregação de músculos',
      [
        { $match: { usuario_id: 'user-1' } },
        { $group: { _id: '$musculos_estimulados', count: { $sum: 1 } } },
      ],
    ],
    [
      'agregação de duração total',
      [
        { $match: { usuario_id: 'user-1' } },
        { $group: { _id: null, total: { $sum: '$duracao_total_segundos' } } },
      ],
    ],
    [
      'agregação mensal',
      [
        { $match: { usuario_id: 'user-1', concluido_em: { $gte: new Date(0) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$concluido_em' } },
            minutos: { $sum: { $divide: ['$duracao_total_segundos', 60] } },
          },
        },
      ],
    ],
  ])('propaga erro na %s', async (_label, pipeline) => {
    dbMocks.from.mockReturnValue(queryReturning({ data: null, error: databaseError }));

    await expect(WorkoutHistory.aggregate(pipeline)).rejects.toBe(databaseError);
  });
});
