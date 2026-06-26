import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const envPath = join(root, 'server', '.env');
const raw = readFileSync(envPath, 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  vars[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const syncKeys = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

const environments = ['production', 'preview'];

for (const envName of environments) {
  for (const key of syncKeys) {
    const value = vars[key];
    if (!value) {
      console.warn(`Skip ${key}: missing in server/.env`);
      continue;
    }

    const add = spawnSync(
      'npx',
      ['vercel', 'env', 'add', key, envName, '--value', value, '--force', '--yes'],
      { cwd: root, stdio: 'inherit', shell: true },
    );

    if (add.status !== 0) {
      console.error(`Failed to add ${key} to ${envName}`);
      process.exit(add.status ?? 1);
    }

    console.log(`OK ${key} → ${envName} (${value.length} chars)`);
  }
}

console.log('Done. Redeploy production for a clean rollout.');
