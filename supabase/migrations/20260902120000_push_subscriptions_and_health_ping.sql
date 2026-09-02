-- Ping público de baixo privilégio para keep-alive (sem dados de usuário).
create table if not exists public.health_ping (
  id int primary key default 1 check (id = 1)
);

insert into public.health_ping (id)
values (1)
on conflict (id) do nothing;

alter table public.health_ping enable row level security;

drop policy if exists health_ping_anon_select on public.health_ping;
create policy health_ping_anon_select
  on public.health_ping
  for select
  to anon
  using (true);

-- Assinaturas Web Push para lembretes personalizados na PWA.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  time_zone text not null default 'America/Sao_Paulo',
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

-- Deduplicação de envios por minuto (evita push duplicado no mesmo slot).
create table if not exists public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delivery_key text not null,
  enviada_em timestamptz not null default now(),
  unique (user_id, delivery_key)
);

create index if not exists idx_push_delivery_log_sent
  on public.push_delivery_log (enviada_em);
