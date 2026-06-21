import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const raw = readFileSync('.env.vercel.production', 'utf8');
const env = {};
for (const line of raw.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  const key = line.slice(0, i);
  let val = line.slice(i + 1);
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  env[key] = val;
}

const url = env.SUPABASE_URL ?? '';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? '';

console.log('URL set:', Boolean(url));
console.log('URL host:', url.replace(/^https:\/\//, '').split('/')[0]);
console.log('Service key length:', serviceKey.length);
console.log('JWT set:', Boolean(env.JWT_SECRET));

if (!url || !serviceKey) {
  console.log('MISSING required vars');
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { error, data } = await sb.from('profiles').select('id').limit(1);

if (error) {
  console.log('PROBE FAILED:', error.message, error.code ?? '');
  process.exit(1);
}

console.log('PROBE OK, sample rows:', data?.length ?? 0);
