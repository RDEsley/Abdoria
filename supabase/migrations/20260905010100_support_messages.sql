-- Mensagens de suporte / feedback do usuário (bug, sugestão, feedback).
-- Acesso via service_role (Express JWT).

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    check (kind in ('bug', 'suggestion', 'feedback')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'resolved', 'archived')),
  texto text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint support_messages_texto_ck check (char_length(trim(texto)) > 0)
);

create index if not exists support_messages_user_created_idx
  on public.support_messages (user_id, created_at desc);
create index if not exists support_messages_status_created_idx
  on public.support_messages (status, created_at desc);
create index if not exists support_messages_kind_created_idx
  on public.support_messages (kind, created_at desc);

drop trigger if exists support_messages_updated_at on public.support_messages;
create trigger support_messages_updated_at
  before update on public.support_messages
  for each row execute function public.update_updated_at();

alter table public.support_messages enable row level security;

revoke all on table public.support_messages from public, anon, authenticated;
grant all on table public.support_messages to service_role;
