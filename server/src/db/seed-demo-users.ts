import bcrypt from 'bcryptjs';
import { User } from '../domain/User.js';
import { ABDORIA_XP_STEP } from '../types/index.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import { DEMO_USERS } from '../db/seeds/demo-users.js';
import { buildNpcCosmeticos } from '../services/abdoria-leaderboard.js';

/** Cria ou atualiza jogadores fictícios para ranking (idempotente). */
export async function seedDemoUsers(): Promise<void> {
  const npcHash = await bcrypt.hash('npc-no-login', 10);
  const today = getTodaySaoPaulo();

  for (const demo of DEMO_USERS) {
    const moedas = Math.floor(demo.gamificacao.nivel_xp / ABDORIA_XP_STEP) + 12;
    await User.findOneAndUpdate(
      { email: demo.email },
      {
        $set: {
          email: demo.email,
          passwordHash: npcHash,
          nome: demo.nome,
          idade: demo.idade,
          peso_kg: 70,
          altura_cm: 170,
          imc: 24.2,
          nivel: demo.nivel,
          objetivo: demo.objetivo,
          onboarding_completed: true,
          terms_accepted_at: new Date(),
          is_demo_npc: true,
          is_guest: false,
          gamificacao: demo.gamificacao,
          cosmeticos: buildNpcCosmeticos(demo.gamificacao.nivel_xp),
          preferencias: {
            descanso_padrao_seg: 25,
            som_habilitado: true,
            sfx_volume: 0.7,
            ciclo_treinos: ['A', 'B', 'C'],
            modo_padrao: 'tempo',
            tutorial_visto: true,
          },
          xp_diario: { ganho_hoje: 0, data_reset: today },
        },
      },
      { upsert: true },
    );
    console.log(`NPC: ${demo.nome} — ${demo.gamificacao.nivel_xp} XP, ${moedas} moedas, streak ${demo.gamificacao.streak_atual}`);
  }

  console.log(`Total NPCs: ${DEMO_USERS.length}`);
}
