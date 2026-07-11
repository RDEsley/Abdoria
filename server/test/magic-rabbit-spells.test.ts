import { describe, expect, it } from 'vitest';
import type { UserRecord } from '../src/domain/User.js';
import { rollMagicRabbitSpell } from '../src/services/afk-rolls.js';
import { PATROL_SPELL_IDS, SPELL_DUPLICATE_DORIAS } from '../../shared/patrol/shop.js';
import { getTodaySaoPaulo } from '../src/utils/timezone.js';
import type { AfkPendingReward } from '../src/types/index.js';

function emptyPending(): AfkPendingReward {
  return {
    xp: 0,
    abdoria: 0,
    frozen_streaks: 0,
    route_drinks: 0,
    exp_instant: 0,
    doria_bags: 0,
    cosmetic_ids: [],
    weapon_ids: [],
    titulo_secreto: false,
    drop_count: 0,
  };
}

function fakeUser(desbloqueados: string[] = [], ultimoDrop: string | null = null): UserRecord {
  return {
    id: 'user-spells',
    preferencias: {
      patrol_armas: {
        desbloqueados,
        arco_equipado: 'arco_01',
        espada_equipada: 'espada_01',
        magia_equipada: null,
        ultimo_drop_magia: ultimoDrop,
      },
    },
  } as unknown as UserRecord;
}

/** Varre kill indexes até achar um em que o roll resulta em drop de magia. */
function firstDroppingKillIndex(user: UserRecord): { killIndex: number; spellId: string } | null {
  for (let killIndex = 0; killIndex < 500; killIndex += 1) {
    const clone = fakeUser(
      [...(user.preferencias.patrol_armas?.desbloqueados ?? [])],
      user.preferencias.patrol_armas?.ultimo_drop_magia ?? null,
    );
    const pending = emptyPending();
    rollMagicRabbitSpell(clone, killIndex, pending);
    if (pending.weapon_ids.length > 0) {
      return { killIndex, spellId: pending.weapon_ids[0] };
    }
  }
  return null;
}

describe('rollMagicRabbitSpell', () => {
  it('nunca dropa magia que o usuário já possui', () => {
    const owned = ['magia_agua', 'magia_terra', 'magia_gelo'];
    for (let killIndex = 0; killIndex < 300; killIndex += 1) {
      const user = fakeUser([...owned]);
      const pending = emptyPending();
      rollMagicRabbitSpell(user, killIndex, pending);
      for (const id of pending.weapon_ids) {
        expect(owned).not.toContain(id);
      }
    }
  });

  it('com a coleção completa, todo drop vira Dorias automaticamente', () => {
    const user = fakeUser([...PATROL_SPELL_IDS]);
    const pending = emptyPending();
    rollMagicRabbitSpell(user, 1, pending);
    expect(pending.weapon_ids).toHaveLength(0);
    expect(pending.abdoria).toBe(SPELL_DUPLICATE_DORIAS);
    expect(pending.drop_count).toBe(1);
  });

  it('no máximo uma magia por dia: drop marca a data e bloqueia novos drops', () => {
    const drop = firstDroppingKillIndex(fakeUser());
    expect(drop).not.toBeNull();

    const user = fakeUser();
    const pending = emptyPending();
    rollMagicRabbitSpell(user, drop!.killIndex, pending);
    expect(pending.weapon_ids).toHaveLength(1);
    expect(user.preferencias.patrol_armas?.ultimo_drop_magia).toBe(getTodaySaoPaulo());

    // Mesmo usuário, mesmo dia: nenhum kill consegue dropar de novo.
    for (let killIndex = 0; killIndex < 300; killIndex += 1) {
      const again = emptyPending();
      rollMagicRabbitSpell(user, killIndex, again);
      expect(again.weapon_ids).toHaveLength(0);
      expect(again.abdoria).toBe(0);
    }
  });

  it('nem todo coelho derrotado dropa magia (existe chance de falhar o dia)', () => {
    let misses = 0;
    for (let killIndex = 0; killIndex < 200; killIndex += 1) {
      const user = fakeUser();
      const pending = emptyPending();
      rollMagicRabbitSpell(user, killIndex, pending);
      if (pending.weapon_ids.length === 0) misses += 1;
    }
    expect(misses).toBeGreaterThan(0);
  });

  it('quando só falta a mais rara, o drop fica bem mais difícil', () => {
    const quaseTudo = PATROL_SPELL_IDS.filter((id) => id !== 'magia_buraco_negro');
    let dropsRestandoRara = 0;
    let dropsColecaoVazia = 0;
    const samples = 400;
    for (let killIndex = 0; killIndex < samples; killIndex += 1) {
      const raro = emptyPending();
      rollMagicRabbitSpell(fakeUser([...quaseTudo]), killIndex, raro);
      if (raro.weapon_ids.length > 0) dropsRestandoRara += 1;

      const cheio = emptyPending();
      rollMagicRabbitSpell(fakeUser(), killIndex, cheio);
      if (cheio.weapon_ids.length > 0) dropsColecaoVazia += 1;
    }
    expect(dropsRestandoRara).toBeLessThan(dropsColecaoVazia);
  });
});
