import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_AFK_PENDING, User, UserMutable } from '../src/domain/User.js';
import { buildPatrolShopResponse, equipPatrolWeapon } from '../src/services/patrol-shop.js';
import type { UserRecord } from '../src/types/user-record.js';

function createEquipmentUser(): UserMutable {
  const now = new Date().toISOString();
  const data: UserRecord = {
    id: 'equipment-test',
    email: 'equipment@test.local',
    nome: 'Ferreiro',
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
    preferencias: {
      arma_preferida: 'arco',
      patrol_armas: {
        arco_equipado: 'arco_01',
        espada_equipada: 'espada_01',
        magia_equipada: null,
        desbloqueados: ['arco_01', 'espada_01'],
      },
    },
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
    },
    onboarding_completed: true,
    is_guest: false,
    is_demo_npc: false,
  };
  return new UserMutable(data);
}

afterEach(() => vi.restoreAllMocks());

describe('Equipamento da Exploração', () => {
  it('torna a categoria escolhida ativa e persiste somente preferências', async () => {
    const user = createEquipmentUser();
    vi.spyOn(User, 'findById').mockResolvedValue(user);
    const save = vi.spyOn(user, 'save').mockResolvedValue(user);

    const result = await equipPatrolWeapon(user.id, 'espada', 'espada_01');

    expect(result).not.toHaveProperty('error');
    expect(user.preferencias.arma_preferida).toBe('espada');
    expect(user.preferencias.patrol_armas?.espada_equipada).toBe('espada_01');
    expect(save).toHaveBeenCalledWith({ profileColumns: ['preferencias'] });

    const shop = buildPatrolShopResponse(user);
    expect(shop.arma_preferida).toBe('espada');
    expect(shop.espadas.find((item) => item.id === 'espada_01')?.equipada).toBe(true);
    expect(shop.arcos.find((item) => item.id === 'arco_01')?.equipada).toBe(false);
  });

  it('não equipa item que o jogador ainda não desbloqueou', async () => {
    const user = createEquipmentUser();
    vi.spyOn(User, 'findById').mockResolvedValue(user);
    const save = vi.spyOn(user, 'save').mockResolvedValue(user);

    await expect(equipPatrolWeapon(user.id, 'arco', 'arco_02')).resolves.toMatchObject({
      error: 'Desbloqueie este item antes de equipar.',
      status: 400,
    });
    expect(user.preferencias.arma_preferida).toBe('arco');
    expect(save).not.toHaveBeenCalled();
  });
});
