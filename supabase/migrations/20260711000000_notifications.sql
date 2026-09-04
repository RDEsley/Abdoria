-- Notificações persistentes (sino da navbar).
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  corpo text,
  payload jsonb not null default '{}'::jsonb,
  lida_em timestamptz,
  criada_em timestamptz not null default now()
);

create index if not exists idx_notifications_user_recent
  on notifications (user_id, criada_em desc);
