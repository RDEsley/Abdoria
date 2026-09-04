-- Core hardening: persistent quest assignments, atomic claim reward,
-- FK indexes, and quest_claims surface-role-only access.

-- ─── quest_assignments (stable per period, America/Sao_Paulo keys) ───────────
create table if not exists public.quest_assignments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_key text not null,
  scope text not null check (scope in ('daily', 'weekly', 'monthly')),
  quest_ids text[] not null,
  goal_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, period_key)
);

create index if not exists quest_assignments_user_scope_idx
  on public.quest_assignments (user_id, scope);

alter table public.quest_assignments enable row level security;

revoke all on table public.quest_assignments from public, anon, authenticated;
grant all on table public.quest_assignments to service_role;

-- ─── Atomic claim: mark rewarded + credit XP/Folhas in one transaction ───────
-- Concurrent callers: only the first to set rewarded_at awards XP.
create or replace function public.claim_quest_reward(
  p_user_id uuid,
  p_quest_id text,
  p_period_key text,
  p_xp integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.quest_claims%rowtype;
  v_xp integer := greatest(0, coalesce(p_xp, 0));
  v_prev_xp integer;
  v_next_xp integer;
  v_prev_blocks integer;
  v_next_blocks integer;
  v_moedas_gained integer := 0;
  v_gam jsonb;
  v_cos jsonb;
begin
  insert into public.quest_claims (user_id, quest_id, period_key, xp_awarded)
  values (p_user_id, p_quest_id, p_period_key, v_xp)
  on conflict (user_id, quest_id, period_key) do nothing;

  select * into rec
  from public.quest_claims
  where user_id = p_user_id
    and quest_id = p_quest_id
    and period_key = p_period_key
  for update;

  if not found then
    raise exception 'claim slot missing';
  end if;

  if rec.rewarded_at is not null then
    return jsonb_build_object(
      'status', 'already_rewarded',
      'xp_awarded', coalesce(rec.xp_awarded, 0),
      'moedas_ganhas', 0
    );
  end if;

  update public.quest_claims
  set
    rewarded_at = now(),
    xp_awarded = v_xp
  where user_id = p_user_id
    and quest_id = p_quest_id
    and period_key = p_period_key
    and rewarded_at is null;

  if not found then
    return jsonb_build_object(
      'status', 'already_rewarded',
      'xp_awarded', coalesce(rec.xp_awarded, 0),
      'moedas_ganhas', 0
    );
  end if;

  if v_xp > 0 then
    select coalesce(gamificacao, '{}'::jsonb), coalesce(cosmeticos, '{}'::jsonb)
      into v_gam, v_cos
    from public.profiles
    where id = p_user_id
    for update;

    if not found then
      raise exception 'profile missing';
    end if;

    v_prev_xp := greatest(0, coalesce((v_gam->>'nivel_xp')::int, 0));
    v_next_xp := v_prev_xp + v_xp;
    v_prev_blocks := greatest(0, coalesce((v_cos->>'moedas_xp_blocos')::int, 0));
    v_next_blocks := floor(v_next_xp / 10.0)::int;
    v_moedas_gained := greatest(0, v_next_blocks - v_prev_blocks);

    v_gam := jsonb_set(v_gam, '{nivel_xp}', to_jsonb(v_next_xp), true);

    if v_moedas_gained > 0 then
      v_cos := jsonb_set(v_cos, '{moedas}', to_jsonb(
        greatest(0, coalesce((v_cos->>'moedas')::int, 0)) + v_moedas_gained
      ), true);
      v_cos := jsonb_set(v_cos, '{moedas_total_ganhas}', to_jsonb(
        greatest(0, coalesce((v_cos->>'moedas_total_ganhas')::int, 0)) + v_moedas_gained
      ), true);
      v_cos := jsonb_set(v_cos, '{moedas_xp_blocos}', to_jsonb(v_next_blocks), true);
    end if;

    update public.profiles
    set
      gamificacao = v_gam,
      cosmeticos = v_cos
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'status', 'awarded',
    'xp_awarded', v_xp,
    'moedas_ganhas', v_moedas_gained
  );
end;
$$;

revoke all on function public.claim_quest_reward(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_quest_reward(uuid, text, text, integer) to service_role;

-- Keep legacy helpers for compatibility; reward path uses claim_quest_reward.
-- Soft-harden quest_claims: service_role only (Express JWT), initplan-safe policies if ever used.
revoke all on table public.quest_claims from public, anon, authenticated;
grant all on table public.quest_claims to service_role;

drop policy if exists "Users can view own quest claims" on public.quest_claims;
drop policy if exists "Users can insert own quest claims" on public.quest_claims;

-- ─── Core FK indexes (nullable columns → partial) ────────────────────────────
create index if not exists activity_logs_activity_id_idx
  on public.activity_logs (activity_id)
  where activity_id is not null;

create index if not exists activity_logs_routine_id_idx
  on public.activity_logs (routine_id)
  where routine_id is not null;

create index if not exists activity_logs_user_routine_day_idx
  on public.activity_logs (user_id, routine_id, day_key)
  where routine_id is not null;

create index if not exists routine_items_activity_id_idx
  on public.routine_items (activity_id);
