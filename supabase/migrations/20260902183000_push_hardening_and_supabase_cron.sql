-- Hardening pós-review: RLS/grants das tabelas push + delivery log por subscription.
-- Scheduler: pg_cron + pg_net lendo segredos do Vault (sem hardcode).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres;

-- ---------------------------------------------------------------------------
-- push_subscriptions / push_delivery_log — somente backend (service role)
-- ---------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;
alter table public.push_delivery_log enable row level security;

revoke all on table public.push_subscriptions from anon, authenticated, public;
revoke all on table public.push_delivery_log from anon, authenticated, public;

drop table if exists public.push_delivery_log;

create table public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  occurrence_key text not null,
  status text not null check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  unique (subscription_id, occurrence_key)
);

create index if not exists idx_push_delivery_log_updated
  on public.push_delivery_log (atualizada_em desc);

alter table public.push_delivery_log enable row level security;
revoke all on table public.push_delivery_log from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- health_ping — somente SELECT mínimo para keep-alive anon
-- ---------------------------------------------------------------------------
revoke all on table public.health_ping from authenticated, public;
grant select on table public.health_ping to anon;

drop policy if exists health_ping_anon_select on public.health_ping;
create policy health_ping_anon_select
  on public.health_ping
  for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- Dispatcher HTTP via Vault (configure manualmente em produção):
--   select vault.create_secret('<CRON_SECRET>', 'evolyn_cron_secret', 'Bearer do reminder push');
--   select vault.create_secret('https://evolyn-core-quest.vercel.app/api/cron/reminder-push', 'evolyn_reminder_cron_url', 'URL do dispatcher');
-- ---------------------------------------------------------------------------
create or replace function private.invoke_reminder_push_dispatch()
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, extensions, vault, public
as $$
declare
  cron_secret text;
  cron_url text;
begin
  select ds.decrypted_secret
  into cron_secret
  from vault.decrypted_secrets ds
  where ds.name = 'evolyn_cron_secret'
  limit 1;

  select ds.decrypted_secret
  into cron_url
  from vault.decrypted_secrets ds
  where ds.name = 'evolyn_reminder_cron_url'
  limit 1;

  if coalesce(cron_secret, '') = '' or coalesce(cron_url, '') = '' then
    raise log 'evolyn reminder push cron skipped: configure vault secrets evolyn_cron_secret and evolyn_reminder_cron_url';
    return;
  end if;

  perform net.http_post(
    url := cron_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function private.invoke_reminder_push_dispatch() from public, anon, authenticated;
grant execute on function private.invoke_reminder_push_dispatch() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'evolyn-reminder-push'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'evolyn-reminder-push',
  '* * * * *',
  $$select private.invoke_reminder_push_dispatch();$$
);
