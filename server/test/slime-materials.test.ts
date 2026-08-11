import { describe, expect, it } from 'vitest';
import {
  AFK_ENEMIES,
  AFK_ROUTE_DRINK_DROP_THRESHOLD,
  SLIME_MATERIALS,
  SLIME_MATERIAL_BY_ENEMY_ID,
  type AfkPendingReward,
} from '../../shared/types/index.js';
import {
  rollLootTable,
  rollRouteDrinkDrop,
  rollSlimeMaterialDrop,
} from '../src/services/afk-rolls.js';
import { addInventoryItem, getItemCount, sellSlimeMaterial } from '../src/services/inventory.js';
import type { UserRecord } from '../src/types/user-record.js';

function pending(): AfkPendingReward {
  return {
    xp: 0,
    abdoria: 0,
    frozen_streaks: 0,
    route_drinks: 0,
    cosmetic_ids: [],
    weapon_ids: [],
    exp_instant: 0,
    doria_bags: 0,
    material_items: {},
    titulo_secreto: false,
    drop_count: 0,
  };
}

function user(): UserRecord {
  return {
    id: 'slime-material-test',
    preferencias: {},
    gamificacao: {
      nivel_xp: 0,
      streak_atual: 0,
      streak_maior: 0,
      total_minutos: 0,
      conquistas: [],
    },
    cosmeticos: {
      moedas: 0,
      moedas_xp_blocos: 0,
      moldura_loja_equipada: 'borda_basica',
      titulo_equipado: null,
      som_equipado: 'som_classico',
      efeito_equipado: 'efeito_padrao',
      banner_equipado: 'fundo_padrao',
      desbloqueados: [],
      codigos_resgatados: [],
    },
    inventario: { itens: [] },
  } as unknown as UserRecord;
}

describe('materiais exclusivos dos slimes', () => {
  it('possui um material diferente para cada inimigo do catálogo', () => {
    expect(SLIME_MATERIALS).toHaveLength(Object.keys(AFK_ENEMIES).length);
    expect(new Set(SLIME_MATERIALS.map((material) => material.id)).size).toBe(
      Object.keys(AFK_ENEMIES).length,
    );
    expect(SLIME_MATERIAL_BY_ENEMY_ID.slime_doce.name).toBe('Pirulito');
    expect(SLIME_MATERIAL_BY_ENEMY_ID.slime_agua.name).toBe('Gota de Água');
    expect(SLIME_MATERIAL_BY_ENEMY_ID.slime_macaco.name).toBe('Banana');
  });

  it('aplica chances e preços definidos por raridade', () => {
    expect(SLIME_MATERIAL_BY_ENEMY_ID.slime_doce).toMatchObject({
      tier: 'common',
      rarity: 'comum',
      dropChancePct: 4,
      sellPrice: 3,
    });
    expect(SLIME_MATERIAL_BY_ENEMY_ID.crystal_slime).toMatchObject({
      tier: 'elite',
      rarity: 'raro',
      dropChancePct: 5,
      sellPrice: 4,
    });
    expect(SLIME_MATERIAL_BY_ENEMY_ID.boss_colossus).toMatchObject({
      tier: 'boss',
      rarity: 'epico',
      dropChancePct: 15,
      sellPrice: 15,
    });
    expect(SLIME_MATERIAL_BY_ENEMY_ID.slime_enigma).toMatchObject({
      tier: 'common',
      rarity: 'mitico',
      dropChancePct: 50,
      sellPrice: 500,
    });
    expect(SLIME_MATERIAL_BY_ENEMY_ID.slime_binario).toMatchObject({
      rarity: 'mitico',
      dropChancePct: 50,
      sellPrice: 500,
    });
  });

  it('limita a pilha a 99, descarta excedentes e permite vender uma pilha inteira', () => {
    const owner = user();
    const common = SLIME_MATERIAL_BY_ENEMY_ID.slime_doce;
    const boss = SLIME_MATERIAL_BY_ENEMY_ID.boss_colossus;

    expect(addInventoryItem(owner, common.id, 120)).toEqual({ added: 99, discarded: 21 });
    expect(getItemCount(owner, common.id)).toBe(99);
    expect(owner.cosmeticos.moedas).toBe(0);

    expect(sellSlimeMaterial(owner, common.id, 4)).toMatchObject({
      ok: true,
      quantity_sold: 4,
      coins_gained: 12,
    });
    expect(getItemCount(owner, common.id)).toBe(95);

    addInventoryItem(owner, boss.id, 2);
    expect(sellSlimeMaterial(owner, boss.id, 'all')).toMatchObject({
      ok: true,
      quantity_sold: 2,
      coins_gained: 30,
    });
    expect(getItemCount(owner, boss.id)).toBe(0);
    expect(owner.cosmeticos.moedas).toBe(42);

    const mythical = SLIME_MATERIAL_BY_ENEMY_ID.slime_enigma;
    addInventoryItem(owner, mythical.id, 1);
    expect(sellSlimeMaterial(owner, mythical.id, 1)).toMatchObject({
      ok: true,
      quantity_sold: 1,
      coins_gained: 500,
    });
    expect(owner.cosmeticos.moedas).toBe(542);
  });

  it('mantém a rolagem de material independente e próxima das chances configuradas', () => {
    const owner = user();
    const samples = 20_000;
    const cases = [
      ['slime_doce', 4],
      ['crystal_slime', 5],
      ['boss_colossus', 15],
      ['slime_enigma', 50],
    ] as const;

    for (const [enemyId, expectedPct] of cases) {
      const rewards = pending();
      let hits = 0;
      for (let index = 1; index <= samples; index += 1) {
        if (rollSlimeMaterialDrop(owner, enemyId, index, rewards)) hits += 1;
      }
      const actualPct = (hits / samples) * 100;
      expect(actualPct).toBeGreaterThan(expectedPct - 1.2);
      expect(actualPct).toBeLessThan(expectedPct + 1.2);
    }
  });

  it('usa 0,5% como chance de Route Drink em cada inimigo elegível', () => {
    expect(AFK_ROUTE_DRINK_DROP_THRESHOLD).toBe(50);
    const owner = user();
    const rewards = pending();
    const samples = 100_000;

    for (let index = 1; index <= samples; index += 1) {
      rollRouteDrinkDrop(owner, index, rewards);
    }

    const actualPct = (rewards.route_drinks / samples) * 100;
    expect(actualPct).toBeGreaterThan(0.4);
    expect(actualPct).toBeLessThan(0.6);
  });

  it('permite que vários drops da tabela principal saiam na mesma vitória', () => {
    const owner = user();
    let foundMultiDrop = false;

    for (let index = 1; index <= 10_000 && !foundMultiDrop; index += 1) {
      const rewards = pending();
      rollLootTable(owner, index, rewards, { tier: 'common' });
      const differentDrops = [
        rewards.xp > 0,
        rewards.abdoria > 0,
        rewards.doria_bags > 0,
        rewards.exp_instant > 0,
      ].filter(Boolean).length;
      foundMultiDrop = differentDrops >= 2;
    }

    expect(foundMultiDrop).toBe(true);
  });
});
