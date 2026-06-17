import 'dotenv/config';
import mongoose from 'mongoose';
import { syncAllUsersProgressData } from '../services/user-data-sync.js';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Defina MONGODB_URI em server/.env');
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(mongoUri!);
  console.log('Conectado ao MongoDB.');
  const result = await syncAllUsersProgressData();
  console.log(`Migração concluída: ${result.users} usuários · ${result.pruned} slugs removidos · +${result.coinsAdjusted} Abdoria coins`);
  await mongoose.disconnect();
}

migrate().catch((error) => {
  console.error('Erro na migração:', error);
  process.exit(1);
});
