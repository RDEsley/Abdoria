import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db.js';
import { Exercise } from '../domain/Exercise.js';
import { User } from '../domain/User.js';
import { WorkoutPreset } from '../domain/WorkoutPreset.js';
import { allExercises } from '../db/seeds/all-exercises.js';
import { EXERCISE_NOME_PT } from '../../../shared/types/exercise-display.js';
import { workoutPresets } from '../db/seeds/workout-presets.js';
import { buildAdminUserPayload } from './admin-user-payload.js';
import {
  LEGACY_PUSH_UP_BOARD_EXERCISE_SLUGS,
  RETIRED_EXERCISE_SLUGS as PRODUCT_RETIRED_EXERCISE_SLUGS,
  filterRetiredExercises,
} from '../../../shared/exercises.js';

const RETIRED_EXERCISE_SLUGS = [
  'pallof-press',
  ...LEGACY_PUSH_UP_BOARD_EXERCISE_SLUGS,
  ...PRODUCT_RETIRED_EXERCISE_SLUGS,
];

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
    const sanitizedPreset = {
      ...preset,
      exercicios: filterRetiredExercises(preset.exercicios),
    };
    const result = await WorkoutPreset.findOneAndUpdate(
      { nome: preset.nome },
      { $set: sanitizedPreset },
      { upsert: true },
    );
    console.log(`Preset: ${result?.nome}`);
  }
  console.log(`Total presets: ${workoutPresets.length}`);

  if (process.env.NODE_ENV === 'production') {
    console.log('Seed de usuários ignorado em produção.');
    console.log('Seed concluído.');
    return;
  }

  const devAdminEmail = process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase();
  const devAdminPassword = process.env.DEV_ADMIN_PASSWORD;

  if (devAdminEmail || devAdminPassword) {
    if (!devAdminEmail || !devAdminPassword) {
      throw new Error('Defina DEV_ADMIN_EMAIL e DEV_ADMIN_PASSWORD juntos.');
    }
    if (devAdminPassword.length < 12) {
      throw new Error('DEV_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
    }

    const adminHash = await bcrypt.hash(devAdminPassword, 10);
    await User.findOneAndUpdate(
      { email: devAdminEmail },
      { $set: buildAdminUserPayload(adminHash, devAdminEmail) },
      { upsert: true },
    );
    console.log(`Administrador de desenvolvimento preparado: ${devAdminEmail}`);
  } else {
    console.log(
      'Administrador de desenvolvimento não criado. Defina DEV_ADMIN_EMAIL e DEV_ADMIN_PASSWORD se necessário.',
    );
  }

  console.log('Seed concluído (sem usuários NPC/demo).');
}

seed().catch((error) => {
  console.error('Erro no seed:', error);
  process.exit(1);
});
