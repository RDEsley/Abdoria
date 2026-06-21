import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

type Cached = { client: SupabaseClient | null; url: string; key: string };

const cached: Cached = { client: null, url: '', key: '' };

function readSupabaseEnv() {
  return {
    url: process.env.SUPABASE_URL?.trim() ?? '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '',
  };
}

export function getSupabase(): SupabaseClient {
  const { url, key } = readSupabaseEnv();
  if (!url || !key) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.');
  }
  if (!cached.client || cached.url !== url || cached.key !== key) {
    cached.url = url;
    cached.key = key;
    cached.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws as any },
    });
  }
  return cached.client;
}

export async function probeDatabase(): Promise<{
  status: 'connected' | 'disconnected';
  error?: string;
}> {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('profiles').select('id').limit(1);
    if (error) return { status: 'disconnected', error: error.message };
    return { status: 'connected' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'disconnected', error: message };
  }
}

export async function connectDB(): Promise<SupabaseClient> {
  return getSupabase();
}
