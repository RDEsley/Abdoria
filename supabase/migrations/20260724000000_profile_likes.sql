-- Curtidas de perfil (coração no perfil público). Unilateral, uma por par de usuários.
create table if not exists profile_likes (
  liker_id uuid not null references profiles (id) on delete cascade,
  liked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_id),
  check (liker_id <> liked_id)
);

create index if not exists idx_profile_likes_liked on profile_likes (liked_id);
