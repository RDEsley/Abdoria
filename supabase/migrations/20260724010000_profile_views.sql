-- Visualizações de perfil (contador de "quem viu meu perfil"). Uma por par de usuários —
-- reabrir o mesmo perfil várias vezes não infla a contagem, é visitante único.
create table if not exists profile_views (
  viewer_id uuid not null references profiles (id) on delete cascade,
  viewed_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, viewed_id),
  check (viewer_id <> viewed_id)
);

create index if not exists idx_profile_views_viewed on profile_views (viewed_id);
