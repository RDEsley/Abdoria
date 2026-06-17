import type { CosmeticDefinition } from '../types/index.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { COSMETICS } from '../data/cosmetics.js';
import { allExercises } from '../seeds/all-exercises.js';
import { ABDORIA_XP_STEP } from '../types/index.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';

const ALL_COSMETIC_IDS = COSMETICS.map((item: CosmeticDefinition) => item.id);
const ALL_ACHIEVEMENT_IDS = ACHIEVEMENTS.map((item) => item.id);
const ALL_EXERCISE_SLUGS = allExercises.map((item) => item.slug);

/** Payload completo para conta admin com tudo desbloqueado. */
export function buildAdminUserPayload(passwordHash: string, email = 'admin@gmail.com') {
  const nivelXp = 50_000;
  const today = getTodaySaoPaulo();

  return {
    email,
    passwordHash,
    nome: 'Admin Abdoria',
    idade: 30,
    peso_kg: 75,
    altura_cm: 175,
    imc: 24.5,
    nivel: 'avancado' as const,
    objetivo: 'definicao' as const,
    onboarding_completed: true,
    terms_accepted_at: new Date(),
    is_guest: false,
    is_demo_npc: false,
    gamificacao: {
      nivel_xp: nivelXp,
      streak_atual: 365,
      streak_maior: 365,
      total_minutos: 5000,
      conquistas: ALL_ACHIEVEMENT_IDS,
    },
    cosmeticos: {
      moedas: 99_999,
      moedas_xp_blocos: Math.floor(nivelXp / ABDORIA_XP_STEP),
      avatar_equipado: 'avatar_coroa',
      borda_equipada: 'borda_lendario',
      titulo_equipado: 'titulo_dono_do_jogo',
      som_equipado: 'som_epico',
      efeito_equipado: 'efeito_glitch',
      fundo_equipado: 'fundo_galaxia',
      desbloqueados: ALL_COSMETIC_IDS,
      codigos_resgatados: ['abdoria'],
    },
    preferencias: {
      descanso_padrao_seg: 25,
      som_habilitado: true,
      sfx_volume: 0.7,
      ciclo_treinos: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      modo_padrao: 'reps',
      reps_series_padrao: 3,
      reps_repeticoes_padrao: 12,
      tutorial_visto: true,
    },
    dados_salvos: {
      exercicios_desbloqueados: ALL_EXERCISE_SLUGS,
      treino_personalizado: [],
      treinos_salvos: [],
    },
    xp_diario: { ganho_hoje: 0, extra_hoje: 0, data_reset: today },
    simulacao_definicao: { gordura_atual_pct: 12, gordura_meta_pct: 10 },
  };
}
