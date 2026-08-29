import { describe, expect, it } from 'vitest';
import type { UserRecord } from '../src/domain/User.js';
import { rollMagicRabbitSpell } from '../src/services/afk-rolls.js';
import { PATROL_SPELL_IDS, SPELL_DUPLICATE_DORIAS } from '../../shared/patrol/shop.js';
import type { AfkPendingReward } from '../src/types/index.js';

function emptyPending(): AfkPendingReward {
  return {
    xp: 0,
    abdoria: 0,
    frozen_streaks: 0,
    route_drinks: 0,
    exp_instant: 0,
    doria_bags: 0,
    material_items: {},
    cosmetic_ids: [],
    weapon_ids: [],
    titulo_secreto: false,
    drop_count: 0,
  };
}

function fakeUser(desbloqueados: string[] = []): UserRecord {
  return {
    id: 'user-spells',
    preferencias: {
      patrol_armas: {
        desbloqueados,
        arco_equipado: 'arco_01',
        espada_equipada: 'espada_01',
        magia_equipada: null,
        ultimo_drop_magia: null,
      },
    },
  } as unknown as UserRecord;
}

describe('rollMagicRabbitSpell', () => {
  it('nunca dropa magia que o usuário já possui', () => {
    const owned = ['magia_agua', 'magia_terra', 'magia_gelo'];
    for (let killIndex = 0; killIndex < 300; killIndex += 1) {
      const pending = emptyPending();
      rollMagicRabbitSpell(fakeUser([...owned]), killIndex, pending);
      for (const id of pending.weapon_ids) expect(owned).not.toContain(id);
    }
  });

  it('com a coleção completa, o encontro vira Dorias automaticamente', () => {
    const pending = emptyPending();
    rollMagicRabbitSpell(fakeUser([...PATROL_SPELL_IDS]), 1, pending);
    expect(pending.weapon_ids).toHaveLength(0);
    expect(pending.abdoria).toBe(SPELL_DUPLICATE_DORIAS);
    expect(pending.drop_count).toBe(1);
  });

  it('cada encontro possui nova rolagem e nem todo slime dropa magia', () => {
    let drops = 0;
    let misses = 0;
    for (let killIndex = 0; killIndex < 500; killIndex += 1) {
      const pending = emptyPending();
      rollMagicRabbitSpell(fakeUser(), killIndex, pending);
      if (pending.weapon_ids.length > 0) drops += 1;
      else misses += 1;
    }
    expect(drops).toBeGreaterThan(0);
    expect(misses).toBeGreaterThan(0);
  });

  it('a chance base permanece próxima de 25% e aceita bônus pequeno da árvore', () => {
    let dropsBase = 0;
    let dropsComBonus = 0;
    const samples = 2_000;
    for (let killIndex = 0; killIndex < samples; killIndex += 1) {
      const base = emptyPending();
      rollMagicRabbitSpell(fakeUser(), killIndex, base);
      dropsBase += base.weapon_ids.length;
      const boosted = emptyPending();
      rollMagicRabbitSpell(fakeUser(), killIndex, boosted, 1);
      dropsComBonus += boosted.weapon_ids.length;
    }
    expect(dropsBase / samples).toBeGreaterThan(0.22);
    expect(dropsBase / samples).toBeLessThan(0.28);
    expect(dropsComBonus).toBeGreaterThanOrEqual(dropsBase);
  });
});
