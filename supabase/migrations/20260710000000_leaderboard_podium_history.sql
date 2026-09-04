-- Histórico de pódios semanais dos rankings (base das molduras de perfil).
create table if not exists leaderboard_podium_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  week_key text not null,
  metric text not null check (metric in ('xp', 'moedas')),
  position int not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  unique (week_key, metric, position)
);

create index if not exists idx_podium_history_user on leaderboard_podium_history (user_id);
