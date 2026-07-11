import { describe, expect, it } from 'vitest';
import {
  ABS_ENFASE_ROTATION,
  FOCO_PARAMS,
  PROGRESSION_WEEKS,
  SESSION_EXERCISE_COUNT,
  SPLIT_TEMPLATES,
  buildPlanoTreino,
  clampFrequencia,
  derivePartesFromFoco,
  doseReps,
  doseTempoSeg,
  weeklyMultiplier,
} from '../../shared/training-plan.js';
import type { PerfilTreino } from '../../shared/types/index.js';
import { isPlanoUser, markPlanoDayCompleted } from '../src/services/plan-generator.js';
import type { UserRecord } from '../src/domain/User.js';
import type { UserMutable } from '../src/repositories/user-repository.js';

const NOW = '2026-07-11T12:00:00.000Z';

function perfil(overrides: Partial<PerfilTreino> = {}): PerfilTreino {
  return {
    escopo: 'corpo_todo',
    foco: 'definicao',
    partes: null,
    frequencia_semanal: 3,
    tempo_por_sessao_min: 20,
    restricoes: [],
    origem: 'onboarding',
    atualizado_em: NOW,
    ...overrides,
  };
}

describe('buildPlanoTreino', () => {
  it('retorna null no escopo só-abdômen (pipeline de presets continua dono)', () => {
    expect(buildPlanoTreino(perfil({ escopo: 'abdomen' }), NOW)).toBeNull();
  });

  it('gera um dia por frequência semanal, todos com abdômen incluído', () => {
    for (let freq = 2; freq <= 7; freq += 1) {
      const plano = buildPlanoTreino(perfil({ frequencia_semanal: freq }), NOW);
      expect(plano).not.toBeNull();
      expect(plano!.dias).toHaveLength(freq);
      expect(plano!.semana_atual).toBe(1);
      expect(plano!.dias_completados_rodada).toEqual([]);
      for (const dia of plano!.dias) {
        expect(dia.grupos).toContain('abdomen');
        expect(dia.enfase_abs).toBe(ABS_ENFASE_ROTATION[dia.indice % ABS_ENFASE_ROTATION.length]);
        expect(dia.titulo).toContain(`Missão ${dia.indice + 1}`);
      }
    }
  });

  it('remove partes desmarcadas; dia esvaziado vira dia de abdômen', () => {
    const plano = buildPlanoTreino(
      perfil({ frequencia_semanal: 3, partes: ['peito', 'bracos'] }),
      NOW,
    );
    // Dia 2 do split de 3 é pernas+glúteos — sem essas partes, sobra só abs.
    const diaPernas = plano!.dias[1];
    expect(diaPernas.grupos).toEqual(['abdomen']);
    expect(diaPernas.titulo).toContain('Abdômen');
    expect(plano!.dias[0].grupos).toContain('peito');
  });

  it('partes null deriva do foco (recomendado)', () => {
    expect(derivePartesFromFoco('definicao')).toEqual(['peito', 'pernas', 'costas']);
    expect(derivePartesFromFoco('hipertrofia')).toContain('bracos');
    expect(derivePartesFromFoco('saude')).toHaveLength(6);

    const plano = buildPlanoTreino(perfil({ foco: 'definicao', frequencia_semanal: 2 }), NOW);
    // Foco definição não inclui braços/ombros — dia 1 do split de 2 perde ombros.
    expect(plano!.dias[0].grupos).not.toContain('ombros');
    expect(plano!.dias[0].grupos).toContain('peito');
  });

  it('clampFrequencia limita ao intervalo 2..7 com fallback 3', () => {
    expect(clampFrequencia(1)).toBe(2);
    expect(clampFrequencia(0)).toBe(3); // 0 = sem resposta → padrão
    expect(clampFrequencia(NaN)).toBe(3);
    expect(clampFrequencia(12)).toBe(7);
    expect(SPLIT_TEMPLATES[clampFrequencia(5)]).toHaveLength(5);
  });
});

describe('dosagem por foco e progressão', () => {
  it('multiplicador semanal cresce 5% ao longo do mesociclo', () => {
    expect(weeklyMultiplier(1)).toBe(1);
    expect(weeklyMultiplier(PROGRESSION_WEEKS)).toBeCloseTo(1.15);
    expect(weeklyMultiplier(99)).toBeCloseTo(1.15); // clamp
  });

  it('força reduz reps e aumenta descanso; resistência inverte', () => {
    const base = 12;
    expect(doseReps(base, 'forca', 1)).toBeLessThan(doseReps(base, 'definicao', 1));
    expect(doseReps(base, 'resistencia', 1)).toBeGreaterThan(doseReps(base, 'definicao', 1));
    expect(FOCO_PARAMS.forca.descanso_seg).toBeGreaterThan(FOCO_PARAMS.resistencia.descanso_seg);
  });

  it('reps e tempo respeitam os limites de segurança', () => {
    expect(doseReps(1, 'forca', 1)).toBeGreaterThanOrEqual(4);
    expect(doseReps(100, 'resistencia', 4)).toBeLessThanOrEqual(30);
    expect(doseTempoSeg(5, 'forca', 1)).toBeGreaterThanOrEqual(10);
    expect(doseTempoSeg(500, 'resistencia', 4)).toBeLessThanOrEqual(120);
    expect(doseTempoSeg(33, 'definicao', 1) % 5).toBe(0);
  });

  it('tempo por sessão mapeia para o número de exercícios', () => {
    expect(SESSION_EXERCISE_COUNT[10]).toBe(4);
    expect(SESSION_EXERCISE_COUNT[45]).toBe(10);
  });
});

describe('isPlanoUser', () => {
  it('exige escopo corpo_todo E plano gerado', () => {
    const base = { perfil_treino: perfil(), plano_treino: buildPlanoTreino(perfil(), NOW) };
    expect(isPlanoUser(base as unknown as UserRecord)).toBe(true);
    expect(isPlanoUser({ ...base, plano_treino: null } as unknown as UserRecord)).toBe(false);
    expect(
      isPlanoUser({
        ...base,
        perfil_treino: perfil({ escopo: 'abdomen' }),
      } as unknown as UserRecord),
    ).toBe(false);
    expect(isPlanoUser({} as unknown as UserRecord)).toBe(false);
  });
});

describe('markPlanoDayCompleted', () => {
  function fakeMutable(plano: ReturnType<typeof buildPlanoTreino>) {
    const saves: unknown[] = [];
    const user = {
      plano_treino: plano,
      save: async function save() {
        saves.push(structuredClone(this.plano_treino));
        return this;
      },
    };
    return { user: user as unknown as UserMutable, saves };
  }

  it('marca o dia e fecha a rodada quando todos concluem, avançando a semana', async () => {
    const plano = buildPlanoTreino(perfil({ frequencia_semanal: 2 }), NOW);
    const { user } = fakeMutable(plano);

    expect(await markPlanoDayCompleted(user, 0)).toBe(false);
    expect(user.plano_treino!.dias_completados_rodada).toEqual([0]);

    expect(await markPlanoDayCompleted(user, 1)).toBe(true);
    expect(user.plano_treino!.dias_completados_rodada).toEqual([]);
    expect(user.plano_treino!.semana_atual).toBe(2);
  });

  it('semana volta ao início após o mesociclo', async () => {
    const plano = buildPlanoTreino(perfil({ frequencia_semanal: 2 }), NOW);
    plano!.semana_atual = PROGRESSION_WEEKS;
    const { user } = fakeMutable(plano);
    await markPlanoDayCompleted(user, 0);
    await markPlanoDayCompleted(user, 1);
    expect(user.plano_treino!.semana_atual).toBe(1);
  });

  it('ignora índice fora do plano e usuário sem plano', async () => {
    const { user } = fakeMutable(buildPlanoTreino(perfil({ frequencia_semanal: 2 }), NOW));
    expect(await markPlanoDayCompleted(user, 9)).toBe(false);
    expect(user.plano_treino!.dias_completados_rodada).toEqual([]);

    const { user: semPlano } = fakeMutable(null);
    expect(await markPlanoDayCompleted(semPlano, 0)).toBe(false);
  });
});
