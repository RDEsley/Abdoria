-- Relação de seguir usuários (base social).
create table if not exists follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followed_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists idx_follows_followed on follows (followed_id);
