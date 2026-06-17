import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, 'server', '.env');
const envExample = join(root, 'server', '.env.example');

if (!existsSync(envPath)) {
  if (existsSync(envExample)) {
    copyFileSync(envExample, envPath);
    console.log('Criado server/.env a partir de server/.env.example');
    console.log('Edite server/.env com MONGODB_URI e JWT_SECRET antes de rodar o projeto.');
  } else {
    console.error('Arquivo server/.env.example não encontrado.');
    process.exit(1);
  }
} else {
  console.log('server/.env já existe.');
}

console.log('\nPróximos passos:');
console.log('  1. Configure server/.env (MongoDB Atlas + JWT_SECRET)');
console.log('  2. npm run seed   — popular exercícios e usuário demo');
console.log('  3. npm run dev    — iniciar client (5173) e API (3001)');
