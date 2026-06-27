import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db.js';
import { Exercise } from '../domain/Exercise.js';
import { User } from '../domain/User.js';
import { WorkoutPreset } from '../domain/WorkoutPreset.js';
import { allExercises } from '../db/seeds/all-exercises.js';
import { EXERCISE_NOME_PT } from '../../../shared/types/exercise-display.js';
import { workoutPresets } from '../db/seeds/workout-presets.js';
import { seedDemoUsers } from './seed-demo-users.js';
import { buildAdminUserPayload } from './admin-user-payload.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';

const RETIRED_EXERCISE_SLUGS = ['pallof-press'];

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em server/.env');
  process.exit(1);
}

async function seed() {
  await connectDB();
  console.log('Conectado ao Supabase.');

  for (const exercise of allExercises) {
    const result = await Exercise.findOneAndUpdate(
      { slug: exercise.slug },
      { $set: { ...exercise, nome_pt: EXERCISE_NOME_PT[exercise.slug] } },
      { upsert: true },
    );
    console.log(`Exercício: ${result?.nome} (${result?.slug})`);
  }
  console.log(`Total exercícios: ${allExercises.length}`);

  if (RETIRED_EXERCISE_SLUGS.length > 0) {
    const retired = await Exercise.updateMany(
      { slug: { $in: RETIRED_EXERCISE_SLUGS } },
      { $set: { ativo: false } },
    );
    if (retired.modifiedCount > 0) {
      console.log(`Exercícios desativados: ${retired.modifiedCount}`);
    }
  }

  for (const preset of workoutPresets) {
    const result = await WorkoutPreset.findOneAndUpdate(
      { nome: preset.nome },
      { $set: preset },
      { upsert: true },
    );
    console.log(`Preset: ${result?.nome}`);
  }
  console.log(`Total presets: ${workoutPresets.length}`);

  if (process.env.NODE_ENV === 'production') {
    console.log('Seed de usuários demo ignorado em produção.');
    console.log('Seed concluído.');
    return;
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  const gmailAdminHash = await bcrypt.hash('1234569', 10);
  const today = getTodaySaoPaulo();

  await User.findOneAndUpdate(
    { email: 'admin@abdoria.local' },
    {
      $set: {
        passwordHash: adminHash,
        nome: 'Admin Abdoria',
        idade: 30,
        peso_kg: 75,
        altura_cm: 175,
        imc: 24.5,
        nivel: 'intermediario',
        objetivo: 'definicao',
        onboarding_completed: true,
        terms_accepted_at: new Date().toISOString(),
        gamificacao: {
          nivel_xp: 240,
          streak_atual: 4,
          streak_maior: 6,
          total_minutos: 42,
          conquistas: ['primeiro_treino', 'streak_2', 'streak_3'],
        },
        preferencias: {
          descanso_padrao_seg: 25,
          som_habilitado: true,
          sfx_volume: 0.7,
          ciclo_treinos: ['A', 'B', 'C', 'D', 'E'],
          modo_padrao: 'tempo',
          tutorial_visto: true,
        },
        xp_diario: { ganho_hoje: 0, data_reset: today },
        simulacao_definicao: { gordura_atual_pct: 18, gordura_meta_pct: 12 },
      },
    },
    { upsert: true },
  );

  await User.findOneAndUpdate(
    { email: 'admin@gmail.com' },
    { $set: buildAdminUserPayload(gmailAdminHash) },
    { upsert: true },
  );

  await seedDemoUsers();

  console.log('Administrador: admin@abdoria.local / admin123');
  console.log('Admin completo: admin@gmail.com / 1234569');
  console.log('Seed concluído.');
}

seed().catch((error) => {
  console.error('Erro no seed:', error);
  process.exit(1);
});
