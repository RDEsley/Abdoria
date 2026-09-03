-- Quest claims: one claim per quest per period per user (idempotent).
create table if not exists public.quest_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  period_key text not null,
  xp_awarded integer not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_id, period_key)
);

alter table public.quest_claims enable row level security;

create policy "Users can read own claims"
  on public.quest_claims for select
  using (auth.uid() = user_id);

create policy "Server can insert claims"
  on public.quest_claims for insert
  with check (auth.uid() = user_id);
