import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, getSupabase } from '../db.js';
import { User } from '../domain/User.js';
import { buildAdminUserPayload } from './admin-user-payload.js';
import { seedDemoUsers } from './seed-demo-users.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';

const CONFIRMATION_PHRASE = 'EVOLYN_PRODUCTION_RESET';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

/**
 * DESTRUTIVO: apaga contas e dados relacionados do projeto Supabase informado.
 *
 * O script não contém e não deve conter credenciais administrativas hardcoded.
 * Todas as confirmações e credenciais devem ser informadas no ambiente apenas
 * durante a execução.
 */
async function resetProduction(): Promise<void> {
  if (process.env.CONFIRM_RESET !== CONFIRMATION_PHRASE) {
    console.log('⚠️  Reset de produção bloqueado.');
    console.log(`    Para confirmar, defina CONFIRM_RESET=${CONFIRMATION_PHRASE}.`);
    console.log('    Nenhum dado foi alterado.');
    return;
  }

  const supabaseUrl = requireEnv('SUPABASE_URL');
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const expectedHost = requireEnv('RESET_EXPECTED_SUPABASE_HOST');
  const adminEmail = requireEnv('RESET_ADMIN_EMAIL').toLowerCase();
  const adminPassword = requireEnv('RESET_ADMIN_PASSWORD');

  if (adminPassword.length < 16) {
    throw new Error('RESET_ADMIN_PASSWORD deve ter pelo menos 16 caracteres.');
  }

  const actualHost = new URL(supabaseUrl).host;
  if (actualHost !== expectedHost) {
    throw new Error(
      `Host Supabase diferente do confirmado. Atual: ${actualHost}; esperado: ${expectedHost}`,
    );
  }

  console.log(`Destino confirmado: ${actualHost}`);
  console.log('Iniciando reset destrutivo explicitamente autorizado...');

  await connectDB();
  const sb = getSupabase();

  const dependentTables = [
    'workout_history',
    'user_afk_state',
    'follows',
    'notifications',
    'app_ratings',
    'app_suggestions',
    'leaderboard_podium_history',
  ];

  for (const table of dependentTables) {
    const { error } = await sb
      .from(table)
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000');

    if (error && !/does not exist|column .* does not exist/i.test(error.message)) {
      console.warn(`Aviso ao limpar ${table}: ${error.message}`);
    }
  }

  const { error: profilesError } = await sb
    .from('profiles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (profilesError) {
    throw new Error(`Erro ao apagar profiles: ${profilesError.message}`);
  }

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const today = getTodaySaoPaulo();
  const adminPayload = buildAdminUserPayload(adminHash, adminEmail);
  adminPayload.xp_diario = { ganho_hoje: 0, data_reset: today };

  await User.findOneAndUpdate({ email: adminEmail }, { $set: adminPayload }, { upsert: true });

  console.log(`Conta administrativa recriada: ${adminEmail}`);

  await seedDemoUsers();
  console.log('Reset de produção concluído.');
}

resetProduction().catch((error) => {
  console.error('Erro no reset de produção:', error);
  process.exit(1);
});
