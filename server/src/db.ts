import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

type Cached = { client: SupabaseClient | null };

const cached: Cached = { client: null };

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.');
  }
  if (!cached.client) {
    cached.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached.client;
}

export async function probeDatabase(): Promise<'connected' | 'disconnected'> {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('profiles').select('id').limit(1);
    return error ? 'disconnected' : 'connected';
  } catch {
    return 'disconnected';
  }
}

export async function connectDB(): Promise<SupabaseClient> {
  return getSupabase();
}
