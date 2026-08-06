import { describe, expect, it } from 'vitest';
import { afkProfileColumns, pauseAfk, readFrozenDia, resumeAfk } from '../src/services/afk.js';
import type { UserRecord } from '../src/types/user-record.js';
import { getTodaySaoPaulo } from '../../shared/utils/timezone.js';

/**
 * Regressões de persistência da Exploração.
 *
 * As duas travadas aqui já quebraram em produção de forma silenciosa: nenhuma
 * gera erro, os dados simplesmente somem. Por isso viram teste em vez de só
 * comentário no código.
 */

function fakeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'u1',
    preferencias: {},
    gamificacao: {},
    afk: { last_seen_at: null, paused_at: null, minutos_acumulados: 0, pending: {} },
    ...overrides,
  } as unknown as UserRecord;
}

describe('AFK — escopo de escrita no perfil', () => {
  it('não inclui preferencias quando o roll diário de Frozen Streak não marcou o dia', () => {
    // O ping de presença roda a cada 60s em QUALQUER tela. Se ele salvasse
    // `preferencias`, apagaria o que o cliente gravou em paralelo (fila de
    // atividades, lembretes, configurações) sem erro nenhum.
    const user = fakeUser();
    const antes = readFrozenDia(user);

    expect(afkProfileColumns(user, antes)).not.toContain('preferencias');
  });

  it('inclui preferencias quando o roll marcou o dia (única escrita legítima)', () => {
    const user = fakeUser();
    const antes = readFrozenDia(user);
    user.preferencias.afk_frozen_ultimo_dia = getTodaySaoPaulo();

    expect(afkProfileColumns(user, antes)).toContain('preferencias');
  });

  it('sempre grava as colunas que as rotas de AFK realmente alteram', () => {
    const user = fakeUser();
    const columns = afkProfileColumns(user, readFrozenDia(user));

    expect(columns).toEqual(expect.arrayContaining(['gamificacao', 'inventario', 'cosmeticos']));
  });
});

describe('AFK — pausa da vila', () => {
  it('pauseAfk marca paused_at (precisa sobreviver ao save/reload)', () => {
    const user = fakeUser({
      afk: {
        last_seen_at: new Date().toISOString(),
        paused_at: null,
        minutos_acumulados: 0,
        pending: {},
      },
    } as Partial<UserRecord>);

    pauseAfk(user);

    expect(user.afk.paused_at).toBeTruthy();
  });

  it('resumeAfk limpa paused_at e reancora o relógio', () => {
    const user = fakeUser({
      afk: {
        last_seen_at: new Date(Date.now() - 3_600_000).toISOString(),
        paused_at: new Date(Date.now() - 1_800_000).toISOString(),
        minutos_acumulados: 0,
        pending: {},
      },
    } as Partial<UserRecord>);

    resumeAfk(user);

    // Sem reancorar `last_seen_at`, o tempo parado na vila seria creditado
    // como exploração assim que o jogador voltasse pra floresta.
    expect(user.afk.paused_at).toBeNull();
    expect(new Date(user.afk.last_seen_at!).getTime()).toBeGreaterThan(Date.now() - 5_000);
  });
});
