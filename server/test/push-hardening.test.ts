import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/20260902183000_push_hardening_and_supabase_cron.sql',
);

describe('migration push hardening', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  it('habilita pg_cron e pg_net de forma reproduzível', () => {
    expect(sql).toMatch(/create extension if not exists pg_cron/i);
    expect(sql).toMatch(/create extension if not exists pg_net/i);
    expect(sql).toMatch(/cron\.schedule/i);
  });

  it('não hardcode segredo do cron e usa Vault', () => {
    expect(sql).not.toMatch(/Bearer [A-Za-z0-9._-]{8,}/);
    expect(sql).toMatch(/vault\.decrypted_secrets/i);
    expect(sql).toMatch(/evolyn_cron_secret/);
    expect(sql).toMatch(/evolyn_reminder_cron_url/);
  });

  it('restringe push_subscriptions e push_delivery_log ao backend', () => {
    expect(sql).toMatch(/alter table public\.push_subscriptions enable row level security/i);
    expect(sql).toMatch(
      /revoke all on table public\.push_subscriptions from anon, authenticated, public/i,
    );
    expect(sql).toMatch(
      /revoke all on table public\.push_delivery_log from anon, authenticated, public/i,
    );
    expect(sql).toMatch(/unique \(subscription_id, occurrence_key\)/i);
  });

  it('mantém health_ping com SELECT mínimo para anon', () => {
    expect(sql).toMatch(/grant select on table public\.health_ping to anon/i);
    expect(sql).toMatch(/revoke all on table public\.health_ping from authenticated, public/i);
  });
});
