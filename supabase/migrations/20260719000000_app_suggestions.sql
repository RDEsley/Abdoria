-- Sugestões/opiniões dos usuários (popup do streak de 7 dias; painel do ADM).

create table if not exists app_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  texto text not null,
  criada_em timestamptz not null default now()
);

create index if not exists app_suggestions_criada_em_idx on app_suggestions (criada_em desc);
