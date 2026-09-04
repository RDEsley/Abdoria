-- Papéis, banimento/suspensão, gems e avaliações do app.

alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists banimento jsonb;
alter table profiles add column if not exists gems integer not null default 0;

create table if not exists app_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  estrelas integer not null check (estrelas between 1 and 5),
  comentario text,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create unique index if not exists app_ratings_user_key on app_ratings (user_id);

-- Primeiro administrador do sistema.
update profiles set role = 'admin' where email = 'richardesleyso@gmail.com';
