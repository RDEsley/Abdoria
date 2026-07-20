import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, getSupabase } from '../db.js';
import { User } from '../domain/User.js';
import { buildAdminUserPayload } from './admin-user-payload.js';
import { seedDemoUsers } from './seed-demo-users.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';

/**
 * DESTRUTIVO: apaga TODAS as contas de usuário e recria a comunidade do zero
 * (o admin principal + 100 NPCs realistas). Pensado para o momento de colocar
 * o app em produção com dados limpos.
 *
 * Trava de segurança: só roda com CONFIRM_RESET=SIM no ambiente. Rodar sem a
 * variável apenas explica o que faria e sai sem tocar em nada.
 *
 *   CONFIRM_RESET=SIM npx tsx server/src/db/reset-production.ts
 */
async function resetProduction(): Promise<void> {
  if (process.env.CONFIRM_RESET !== 'SIM') {
    console.log('⚠️  Este script APAGA todas as contas de usuário do banco.');
    console.log('    Para confirmar, rode com CONFIRM_RESET=SIM:');
    console.log('    CONFIRM_RESET=SIM npx tsx server/src/db/reset-production.ts');
    console.log('    Nada foi alterado.');
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em server/.env');
    process.exit(1);
  }

  await connectDB();
  const sb = getSupabase();
  console.log('Conectado ao Supabase. Limpando dados de usuários...');

  // Tabelas dependentes primeiro (a FK on delete cascade cobre o resto, mas
  // limpamos explicitamente o que não referencia profiles por cascade direto).
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
    const { error } = await sb.from(table).delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (error && !/does not exist|column .* does not exist/i.test(error.message)) {
      console.warn(`Aviso ao limpar ${table}: ${error.message}`);
    }
  }

  const { error: profilesError } = await sb
    .from('profiles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (profilesError) {
    console.error('Erro ao apagar profiles:', profilesError.message);
    process.exit(1);
  }
  console.log('Todas as contas foram removidas.');

  // Recria o admin principal (Richard) e a comunidade fictícia.
  const gmailAdminHash = await bcrypt.hash('1234569', 10);
  const today = getTodaySaoPaulo();
  const adminPayload = buildAdminUserPayload(gmailAdminHash);
  adminPayload.xp_diario = { ganho_hoje: 0, data_reset: today };

  await User.findOneAndUpdate(
    { email: 'admin@gmail.com' },
    { $set: adminPayload },
    { upsert: true },
  );
  console.log('Admin recriado: admin@gmail.com');

  await seedDemoUsers();
  console.log('Reset de produção concluído.');
}

resetProduction().catch((error) => {
  console.error('Erro no reset de produção:', error);
  process.exit(1);
});
