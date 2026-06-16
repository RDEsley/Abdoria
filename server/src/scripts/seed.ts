import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Exercise } from '../models/Exercise.js';
import { User } from '../models/User.js';
import { WorkoutPreset } from '../models/WorkoutPreset.js';
import { allExercises } from '../seeds/all-exercises.js';
import { workoutPresets } from '../seeds/workout-presets.js';
import { seedDemoUsers } from './seed-demo-users.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Defina MONGODB_URI em server/.env');
  process.exit(1);
}

/** Popula exercícios, presets e usuário administrador (idempotente via upsert). */
async function seed() {
  await mongoose.connect(mongoUri!);
  console.log('Conectado ao MongoDB.');

  for (const exercise of allExercises) {
    const result = await Exercise.findOneAndUpdate(
      { slug: exercise.slug },
      { $set: exercise },
      { upsert: true, new: true, runValidators: true },
    );
    console.log(`Exercício: ${result.nome} (${result.slug})`);
  }
  console.log(`Total exercícios: ${allExercises.length}`);

  for (const preset of workoutPresets) {
    const result = await WorkoutPreset.findOneAndUpdate(
      { nome: preset.nome },
      { $set: preset },
      { upsert: true, new: true, runValidators: true },
    );
    console.log(`Preset: ${result.nome}`);
  }
  console.log(`Total presets: ${workoutPresets.length}`);

  const adminHash = await bcrypt.hash('admin123', 10);
  const today = getTodaySaoPaulo();

  await User.findOneAndUpdate(
    { email: 'admin@abdoria.local' },
    {
      $set: {
        email: 'admin@abdoria.local',
        passwordHash: adminHash,
        nome: 'Admin Abdoria',
        idade: 30,
        peso_kg: 75,
        altura_cm: 175,
        imc: 24.5,
        nivel: 'intermediario',
        objetivo: 'definicao',
        onboarding_completed: true,
        terms_accepted_at: new Date(),
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
    { upsert: true, new: true, runValidators: true },
  );

  await seedDemoUsers();

  console.log('Administrador: admin@abdoria.local / admin123');
  console.log('Seed concluído.');
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('Erro no seed:', error);
  process.exit(1);
});
