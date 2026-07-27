-- Denúncias de usuário (perfil público → botão de reportar).
create table if not exists user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  reported_id uuid not null references profiles (id) on delete cascade,
  motivo text not null,
  descricao text,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  revisado_por uuid references profiles (id) on delete set null,
  revisado_em timestamptz,
  check (reporter_id <> reported_id)
);

create index if not exists idx_user_reports_status on user_reports (status, criado_em desc);
create index if not exists idx_user_reports_reported on user_reports (reported_id);
