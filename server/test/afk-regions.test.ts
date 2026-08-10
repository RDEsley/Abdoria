import { describe, expect, it } from 'vitest';
import {
  AFK_REGIONS,
  AFK_SKILL_NODES,
  getAfkRegionProgress,
  getEnemyAttackDamage,
  getNextAfkRegion,
} from '../../shared/types/index.js';
import { EMPTY_AFK_PENDING, normalizeCombat } from '../src/repositories/user-repository.js';
import { selectAfkRegion } from '../src/services/afk-adventure.js';
import { persistCurrentEnemyHp } from '../src/services/afk-combat.js';
import type { UserRecord } from '../src/types/user-record.js';

function createTravelUser(): UserRecord {
  const now = new Date().toISOString();
  return {
    id: 'region-travel-test',
    email: 'region-travel@test.local',
    nome: 'Viajante',
    nivel: 'iniciante',
    objetivo: 'definicao',
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
      desbloqueados: ['borda_basica'],
      codigos_resgatados: [],
    },
    loja_diaria: { data_reset: '', slots: [] },
    simulacao_definicao: { gordura_meta_pct: 12 },
    preferencias: {},
    dados_salvos: {
      treino_personalizado: [],
      treinos_salvos: [],
      esquemas_reps: {},
      exercicios_desbloqueados: [],
    },
    xp_diario: { ganho_hoje: 0, data_reset: '' },
    inventario: { itens: [] },
    afk: {
      last_seen_at: now,
      minutos_acumulados: 0,
      pending: { ...EMPTY_AFK_PENDING },
      combat: normalizeCombat({
        region_id: 'verdant-trail',
        unlocked_regions: ['verdant-trail', 'sunspire-ruins'],
        adventure_started: true,
        paused_at: null,
        combat_last_at: now,
        region_progress: {
          'verdant-trail': { kills_until_boss: 0, boss_defeated: true, boss_kills: 1 },
        },
      }),
    },
    onboarding_completed: true,
    is_guest: false,
    is_demo_npc: false,
  };
}

describe('Exploração AFK — campanha por regiões', () => {
  it('possui seis capítulos fixos com as metas próprias da campanha', () => {
    expect(AFK_REGIONS.map((region) => region.id)).toEqual([
      'verdant-trail',
      'sunspire-ruins',
      'mooncrystal-marsh',
      'stone-fortress',
      'timekeep',
      'pillowwood',
    ]);
    expect(AFK_REGIONS.map((region) => region.killsToBoss)).toEqual([100, 150, 200, 225, 250, 275]);
    expect(new Set(AFK_REGIONS.map((region) => region.backgroundUrl)).size).toBe(6);
  });

  it('mantém a região escolhida independentemente do total global de abates', () => {
    expect(getAfkRegionProgress(0, 'verdant-trail').region.id).toBe('verdant-trail');
    expect(getAfkRegionProgress(999_999, 'verdant-trail').region.id).toBe('verdant-trail');
    expect(getAfkRegionProgress(0, 'mooncrystal-marsh').region.id).toBe('mooncrystal-marsh');
  });

  it('persiste a troca de região quando a sincronização AFK normaliza o combate', () => {
    const user = createTravelUser();

    expect(selectAfkRegion(user, 'sunspire-ruins')).toEqual({ ok: true });
    expect(user.afk.combat?.region_id).toBe('sunspire-ruins');
    expect(user.afk.combat?.enemy_id).toBe('sand_slime');
    expect(user.afk.combat?.kills_until_boss).toBe(
      user.afk.combat?.region_progress?.['sunspire-ruins']?.kills_until_boss,
    );
  });

  it('segue a ordem da campanha e termina no Bosque dos Travesseiros', () => {
    expect(getNextAfkRegion('verdant-trail')?.id).toBe('sunspire-ruins');
    expect(getNextAfkRegion('timekeep')?.id).toBe('pillowwood');
    expect(getNextAfkRegion('pillowwood')).toBeNull();
  });

  it('preserva o contador individual de cada região depois de serializar e recarregar', () => {
    const combat = normalizeCombat({
      region_id: 'mooncrystal-marsh',
      kills_total: 401,
      kills_until_boss: 73,
      unlocked_regions: ['verdant-trail', 'sunspire-ruins', 'mooncrystal-marsh'],
      region_progress: {
        'verdant-trail': { kills_until_boss: 19, boss_defeated: true, boss_kills: 2 },
        'sunspire-ruins': { kills_until_boss: 44, boss_defeated: true, boss_kills: 1 },
        'mooncrystal-marsh': { kills_until_boss: 73, boss_defeated: false, boss_kills: 0 },
      },
    });
    const reloaded = normalizeCombat(JSON.parse(JSON.stringify(combat)));

    expect(reloaded.region_progress?.['verdant-trail']?.kills_until_boss).toBe(19);
    expect(reloaded.region_progress?.['sunspire-ruins']?.kills_until_boss).toBe(44);
    expect(reloaded.region_progress?.['mooncrystal-marsh']?.kills_until_boss).toBe(73);
    expect(reloaded.kills_until_boss).toBe(73);
  });

  it('recupera encontros interrompidos com o inimigo salvo em zero HP', () => {
    const combat = normalizeCombat({
      region_id: 'sunspire-ruins',
      enemy_id: 'sand_slime',
      enemy_hp: 0,
      unlocked_regions: ['verdant-trail', 'sunspire-ruins'],
    });

    expect(combat.enemy_hp).toBe(1);
  });

  it('salva dano parcial sem curar o alvo nem aceitar uma escrita atrasada', () => {
    const user = createTravelUser();
    const combat = user.afk.combat!;
    const originalHp = combat.enemy_hp;

    expect(persistCurrentEnemyHp(user, combat.kills_total, combat.enemy_id, originalHp - 7)).toBe(
      true,
    );
    expect(user.afk.combat?.enemy_hp).toBe(originalHp - 7);
    expect(persistCurrentEnemyHp(user, combat.kills_total, combat.enemy_id, originalHp)).toBe(true);
    expect(user.afk.combat?.enemy_hp).toBe(originalHp - 7);
    expect(persistCurrentEnemyHp(user, combat.kills_total + 1, combat.enemy_id, 1)).toBe(false);
  });

  it('derruba o herói em 10 ataques comuns, 8 de elite e 1 de chefe', () => {
    const heroMaxHp = 283;
    const common = getEnemyAttackDamage('bat', 6, heroMaxHp);
    const elite = getEnemyAttackDamage('nightmare_slime', 6, heroMaxHp);

    expect(common * 9).toBeLessThan(heroMaxHp);
    expect(common * 10).toBeGreaterThanOrEqual(heroMaxHp);
    expect(elite * 7).toBeLessThan(heroMaxHp);
    expect(elite * 8).toBeGreaterThanOrEqual(heroMaxHp);
    expect(getEnemyAttackDamage('boss_preguica', 6, heroMaxHp)).toBe(Number.POSITIVE_INFINITY);
  });

  it('mantém os quatro caminhos da árvore separados a partir do núcleo central', () => {
    const nodesById = new Map(AFK_SKILL_NODES.map((node) => [node.id, node]));
    const core = nodesById.get('core_instinct');

    expect(core).toMatchObject({ x: 50, y: 50 });

    for (const node of AFK_SKILL_NODES) {
      for (const requirementId of node.requires) {
        if (requirementId === 'core_instinct') continue;
        expect(nodesById.get(requirementId)?.branch).toBe(node.branch);
      }
    }

    for (const branch of ['arco', 'espada', 'magia', 'fortuna'] as const) {
      expect(
        AFK_SKILL_NODES.some(
          (node) => node.branch === branch && node.requires.includes('core_instinct'),
        ),
      ).toBe(true);
    }
  });
});
